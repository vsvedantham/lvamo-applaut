import type { ReferralRequestStatus } from './api/referralRequests'

export const STATUS_LABEL: Record<ReferralRequestStatus, string> = {
  pending_review: 'Pending review',
  under_review: 'Under review',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

// Reuses the app's existing warn/success/danger tokens rather than
// introducing new ones — pending/in-progress states read as "waiting"
// (warn), a decision reads as clearly positive or negative.
export const STATUS_COLOR: Record<ReferralRequestStatus, { bg: string; border: string; fg: string }> = {
  pending_review: { bg: 'var(--warn-bg)', border: 'var(--warn-border)', fg: 'var(--warn)' },
  under_review: { bg: 'var(--warn-bg)', border: 'var(--warn-border)', fg: 'var(--warn)' },
  accepted: { bg: 'var(--success-bg)', border: 'var(--success-border)', fg: 'var(--success)' },
  rejected: { bg: 'var(--danger-bg)', border: 'var(--danger-border)', fg: 'var(--danger)' },
}
