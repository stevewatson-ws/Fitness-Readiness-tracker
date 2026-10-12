//
//  HealthKitSyncService.swift
//  FitnessIntelligence
//
//  Uploads collected Apple Health biometric samples to the backend API.
//

import Foundation

public class HealthKitSyncService {
    public static let shared = HealthKitSyncService()
    private let manager = HealthKitManager.shared

    private init() {}

    public func syncTodayHealthKitData(backendBaseURL: URL, authToken: String) async throws -> Bool {
        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: today)

        var records: [HealthRecordPayload] = []

        // 1. Sleep
        let (sleepHours, deepHours, remHours) = try await manager.querySleep(for: today)
        if sleepHours > 0 {
            records.append(HealthRecordPayload(
                date: dateString,
                metricType: "sleep_hours",
                value: round(sleepHours * 100) / 100,
                unit: "hours",
                source: "apple_health",
                raw: ["deep": "\(deepHours)", "rem": "\(remHours)"]
            ))
        }

        // 2. Resting Heart Rate
        if let rhr = try await manager.queryRestingHeartRate(for: today) {
            records.append(HealthRecordPayload(
                date: dateString,
                metricType: "resting_heart_rate",
                value: round(rhr * 10) / 10,
                unit: "bpm",
                source: "apple_health",
                raw: nil
            ))
        }

        // 3. Heart Rate Variability (SDNN)
        if let hrv = try await manager.queryHRV(for: today) {
            records.append(HealthRecordPayload(
                date: dateString,
                metricType: "hrv_ms",
                value: round(hrv * 10) / 10,
                unit: "ms",
                source: "apple_health",
                raw: nil
            ))
        }

        guard !records.isEmpty else {
            return false
        }

        let syncPayload = HealthKitSyncPayload(healthRecords: records, workouts: [])
        let url = backendBaseURL.appendingPathComponent("api/sync/apple-health")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let bearerToken = authToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !bearerToken.isEmpty else {
            throw URLError(.userAuthenticationRequired)
        }
        request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let requestBody = HealthKitAPIRequest(
            syncType: "incremental",
            source: "apple_health",
            data: syncPayload
        )
        request.httpBody = try JSONEncoder().encode(requestBody)

        let (_, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
            return true
        }

        return false
    }
}
