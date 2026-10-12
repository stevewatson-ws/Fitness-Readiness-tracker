//
//  HealthKitDataModels.swift
//  FitnessIntelligence
//
//  Swift data models for serializing Apple HealthKit samples to the backend API.
//

import Foundation

public struct HealthRecordPayload: Codable {
    public let date: String
    public let metricType: String
    public let value: Double
    public let unit: String
    public let source: String
    public let raw: [String: String]?

    enum CodingKeys: String, CodingKey {
        case date
        case metricType = "metric_type"
        case value
        case unit
        case source
        case raw
    }
}

public struct WorkoutPayload: Codable {
    public let date: String
    public let workoutType: String
    public let durationMins: Double
    public let energyKcal: Double?
    public let avgHeartRate: Double?
    public let maxHeartRate: Double?
    public let source: String

    enum CodingKeys: String, CodingKey {
        case date
        case workoutType = "workout_type"
        case durationMins = "duration_mins"
        case energyKcal = "energy_kcal"
        case avgHeartRate = "avg_heart_rate"
        case maxHeartRate = "max_heart_rate"
        case source
    }
}

public struct HealthKitSyncPayload: Codable {
    public let healthRecords: [HealthRecordPayload]
    public let workouts: [WorkoutPayload]
}

public struct HealthKitAPIRequest: Codable {
    public let syncType: String
    public let source: String
    public let data: HealthKitSyncPayload

    enum CodingKeys: String, CodingKey {
        case syncType = "sync_type"
        case source
        case data
    }
}
