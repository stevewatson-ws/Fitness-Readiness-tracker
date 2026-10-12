//
//  HealthKitPermissionView.swift
//  FitnessIntelligence
//
//  SwiftUI permission sheet explaining why Apple Health data is required.
//

import SwiftUI

public struct HealthKitPermissionView: View {
    @ObservedObject var healthKitManager = HealthKitManager.shared
    @Environment(\.dismiss) var dismiss
    @State private var isRequesting = false

    public init() {}

    public var body: some View {
        VStack(spacing: 24) {
            // Header Icon
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "heart.text.square.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.red)
            }
            .padding(.top, 20)

            VStack(spacing: 8) {
                Text("Connect Apple Health")
                    .font(.title2.bold())
                Text("AURA reads your sleep cycles, heart rate variability, and resting pulse to infer your physiological recovery readiness using fuzzy logic.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Required Permissions List
            VStack(alignment: .leading, spacing: 16) {
                PermissionRow(
                    icon: "bed.double.fill",
                    color: .indigo,
                    title: "Sleep Architecture",
                    description: "Analyzes total sleep, deep restorative sleep, and REM stages."
                )
                PermissionRow(
                    icon: "waveform.path.ecg",
                    color: .red,
                    title: "Heart Rate Variability (HRV)",
                    description: "Calculates parasympathetic autonomic recovery vs your 60-day baseline."
                )
                PermissionRow(
                    icon: "heart.fill",
                    color: .pink,
                    title: "Resting Heart Rate",
                    description: "Tracks cardiac strain, infection risk, and central nervous fatigue."
                )
                PermissionRow(
                    icon: "flame.fill",
                    color: .orange,
                    title: "Workouts & Active Energy",
                    description: "Measures acute and chronic physical load (ACWR safety ratio)."
                )
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(16)
            .padding(.horizontal)

            Spacer()

            // Connect Button
            Button(action: {
                isRequesting = true
                Task {
                    _ = try? await healthKitManager.requestAuthorization()
                    isRequesting = false
                    dismiss()
                }
            }) {
                HStack {
                    if isRequesting {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Allow Apple Health Access")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(14)
            }
            .padding(.horizontal)
            .disabled(isRequesting)

            Button("Skip for Now") {
                dismiss()
            }
            .font(.footnote)
            .foregroundColor(.secondary)
            .padding(.bottom, 10)
        }
        .padding()
    }
}

struct PermissionRow: View {
    let icon: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.system(size: 22))
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
