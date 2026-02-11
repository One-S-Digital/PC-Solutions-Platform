import React, { useState, useEffect, useRef } from 'react'
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useApiClient, apiService } from '../../services/api'

interface Props {
  isOpen: boolean
  campaignId: string
  onClose: () => void
  onComplete: () => void
}

const SendProgressOverlay: React.FC<Props> = ({ isOpen, campaignId, onClose, onComplete }) => {
  const apiClient = useApiClient()
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalSent, setTotalSent] = useState(0)
  const [totalFailed, setTotalFailed] = useState(0)
  const [totalEstimated, setTotalEstimated] = useState(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (isOpen && campaignId && !sending && !done) {
      cancelledRef.current = false
      startSending()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, campaignId])

  const startSending = async () => {
    setSending(true)
    setError(null)

    try {
      let isDone = false
      while (!isDone && !cancelledRef.current) {
        const res = await apiService.mailingSendBatch(apiClient, campaignId, { batchSize: 100 })
        const data = res.data

        setTotalSent(data.totalSentSoFar)
        setTotalFailed(data.totalFailedSoFar)
        setTotalEstimated(data.totalEstimated)
        isDone = data.done

        if (!isDone) {
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      if (!cancelledRef.current) {
        setDone(true)
        onComplete()
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async () => {
    cancelledRef.current = true
    try {
      await apiService.mailingCancelCampaign(apiClient, campaignId)
    } catch {
      // ignore
    }
    onClose()
  }

  if (!isOpen) return null

  const progress = totalEstimated > 0 ? Math.round(((totalSent + totalFailed) / totalEstimated) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {done ? 'Campaign Sent' : error ? 'Send Error' : 'Sending Campaign...'}
          </h3>
          {(done || error) && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  done ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-900">{totalEstimated}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-700">{totalSent}</p>
              <p className="text-xs text-green-600">Sent</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-700">{totalFailed}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
          </div>

          {/* Status message */}
          {sending && !done && !error && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending emails... Do not close this window.
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Campaign sent successfully!
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          {!done && !error && sending && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              Cancel Sending
            </button>
          )}
          {(done || error) && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SendProgressOverlay
