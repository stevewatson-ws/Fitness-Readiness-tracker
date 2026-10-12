//
//  HealthKitManager.swift
//  FitnessIntelligence
//
//  Full native HKHealthStore manager for querying biometrics, registering
//  background delivery, and reading sleep architecture, HRV, and resting HR.
//

import Foundation
import HealthKit

public class HealthKitManager: ObservableObject {
    public static let shared = HealthKitManager()
    public let healthStore = HKHealthStore()

    @Published public var isAuthorized: Bool = false
    @Published public var authorizationError: String? = nil

    private init() {}

    // MARK: - HealthKit Types
    public var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = []
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
        if let rhr = HKObjectType.quantityType(forIdentifier: .restingHeartRate) { types.insert(rhr) }
        if let hrv = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { types.insert(hrv) }
        if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { types.insert(hr) }
        if let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(activeEnergy) }
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { types.insert(steps) }
        types.insert(HKObjectType.workoutType())
        return types
    }

    public var writeTypes: Set<HKSampleType> {
        var types: Set<HKSampleType> = []
        types.insert(HKObjectType.workoutType())
        return types
    }

    // MARK: - Authorization Request
    public func requestAuthorization() async throws -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw NSError(domain: "HealthKitManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "HealthKit not available on this device"])
        }

        try await healthStore.requestAuthorization(toShare: writeTypes, read: readTypes)
        await MainActor.run {
            self.isAuthorized = true
        }
        return true
    }

    // MARK: - Background Delivery Registration
    public func enableBackgroundDelivery() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let typesToObserve: [HKSampleType] = [
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKObjectType.workoutType()
        ]

        for sampleType in typesToObserve {
            healthStore.enableBackgroundDelivery(for: sampleType, frequency: .immediate) { success, error in
                if let error = error {
                    print("Failed background delivery for \(sampleType): \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Query Sleep Analysis (Total Duration & Stages)
    public func querySleep(for date: Date) async throws -> (totalHours: Double, deepHours: Double, remHours: Double) {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            return (0, 0, 0)
        }

        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        // Search window covers previous evening 6pm to current day 12pm
        let queryStart = calendar.date(byAdding: .hour, value: -6, to: startOfDay)!
        let queryEnd = calendar.date(byAdding: .hour, value: 12, to: startOfDay)!

        let predicate = HKQuery.predicateForSamples(withStart: queryStart, end: queryEnd, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let categorySamples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: (0, 0, 0))
                    return
                }

                var totalSecs: Double = 0
                var deepSecs: Double = 0
                var remSecs: Double = 0

                for s in categorySamples {
                    let dur = s.endDate.timeIntervalSince(s.startDate)
                    if #available(iOS 16.0, *) {
                        switch s.value {
                        case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                            deepSecs += dur
                            totalSecs += dur
                        case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                            remSecs += dur
                            totalSecs += dur
                        case HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                             HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                            totalSecs += dur
                        default:
                            break
                        }
                    } else {
                        if s.value == HKCategoryValueSleepAnalysis.asleep.rawValue {
                            totalSecs += dur
                        }
                    }
                }

                continuation.resume(returning: (
                    totalHours: totalSecs / 3600.0,
                    deepHours: deepSecs / 3600.0,
                    remHours: remSecs / 3600.0
                ))
            }
            self.healthStore.execute(query)
        }
    }

    // MARK: - Query Resting Heart Rate
    public func queryRestingHeartRate(for date: Date) async throws -> Double? {
        guard let rhrType = HKObjectType.quantityType(forIdentifier: .restingHeartRate) else { return nil }
        return try await queryLatestQuantity(type: rhrType, unit: HKUnit(from: "count/min"), date: date)
    }

    // MARK: - Query Heart Rate Variability (SDNN)
    public func queryHRV(for date: Date) async throws -> Double? {
        guard let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return nil }
        return try await queryLatestQuantity(type: hrvType, unit: HKUnit.secondUnit(with: .milli), date: date)
    }

    // MARK: - Helper Quantity Query
    private func queryLatestQuantity(type: HKQuantityType, unit: HKUnit, date: Date) async throws -> Double? {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                continuation.resume(returning: sample.quantity.doubleValue(for: unit))
            }
            self.healthStore.execute(query)
        }
    }
}
