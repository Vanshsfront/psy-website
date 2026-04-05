"use client"

import { useState, useEffect, useCallback } from "react"
import { RotateCcw, ChevronDown, ChevronUp, X } from "lucide-react"

interface ReturnRequest {
  id: string
  reason: string
  status: string
  admin_notes: string | null
  refund_amount: number | null
  created_at: string
  orders: { order_number: string } | null
  shop_customers: { name: string; email: string } | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case "requested":
      return "bg-warning/20 text-warning border border-warning/50"
    case "approved":
      return "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
    case "rejected":
      return "bg-danger/20 text-danger border border-danger/50"
    case "completed":
      return "bg-neon-green/20 text-neon-green border border-neon-green/50"
    default:
      return "bg-borderDark text-white"
  }
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState("")
  const [adminNotes, setAdminNotes] = useState("")

  const fetchReturns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/returns")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setReturns(data)
    } catch {
      console.error("Failed to fetch returns")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const handleExpand = (ret: ReturnRequest) => {
    if (expandedId === ret.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(ret.id)
    setRefundAmount(ret.refund_amount?.toString() || "")
    setAdminNotes(ret.admin_notes || "")
  }

  const updateReturn = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const body: Record<string, unknown> = { status, admin_notes: adminNotes }
      if (
        (status === "approved" || status === "completed") &&
        refundAmount
      ) {
        body.refund_amount = parseFloat(refundAmount)
      }

      const res = await fetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Update failed")

      setExpandedId(null)
      await fetchReturns()
    } catch {
      console.error("Failed to update return")
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-light text-primaryText mb-1">
          Returns
        </h1>
        <p className="text-mutedText text-sm">
          Manage return requests and process refunds
        </p>
      </div>

      {isLoading ? (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="divide-y divide-borderDark">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse bg-surfaceLighter/30"
              />
            ))}
          </div>
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-20 text-mutedText">
          <RotateCcw className="w-10 h-10 mx-auto mb-4 text-mutedText/40" />
          <p className="text-lg mb-2">No return requests</p>
          <p className="text-sm">
            Return requests from customers will appear here
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-mutedText text-xs uppercase tracking-widest font-mono">
                  <th className="p-4 font-medium">Return ID</th>
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Reason</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {returns.map((ret) => (
                  <tr key={ret.id} className="group">
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <div className="flex items-center hover:bg-surfaceLighter/50 transition-colors">
                        <div className="p-4 w-[120px]">
                          <span className="font-mono text-xs text-mutedText">
                            {ret.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div className="p-4 flex-1 min-w-[100px]">
                          <span className="font-mono text-neon-cyan text-xs font-bold">
                            {ret.orders?.order_number || "—"}
                          </span>
                        </div>
                        <div className="p-4 flex-1 min-w-[140px]">
                          <p className="font-medium text-primaryText text-sm">
                            {ret.shop_customers?.name || "—"}
                          </p>
                          <p className="text-xs text-mutedText">
                            {ret.shop_customers?.email || ""}
                          </p>
                        </div>
                        <div className="p-4 flex-1 min-w-[160px]">
                          <p className="text-mutedText text-xs line-clamp-1">
                            {ret.reason}
                          </p>
                        </div>
                        <div className="p-4 min-w-[100px]">
                          <span
                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${getStatusBadge(ret.status)}`}
                          >
                            {ret.status}
                          </span>
                        </div>
                        <div className="p-4 min-w-[100px] text-mutedText text-xs">
                          {new Date(ret.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div className="p-4 min-w-[80px] text-right">
                          <button
                            onClick={() => handleExpand(ret)}
                            className="inline-flex items-center gap-1 text-xs text-mutedText hover:text-neon-cyan transition-colors px-2 py-1 rounded hover:bg-surfaceLighter"
                          >
                            {expandedId === ret.id ? (
                              <>
                                Close <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                View <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedId === ret.id && (
                        <div className="bg-background border-t border-borderDark p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xs uppercase tracking-widest text-mutedText mb-2">
                                Full Reason
                              </h3>
                              <p className="text-sm text-primaryText max-w-xl">
                                {ret.reason}
                              </p>
                            </div>
                            <button
                              onClick={() => setExpandedId(null)}
                              className="text-mutedText hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {ret.refund_amount != null && (
                            <div>
                              <h3 className="text-xs uppercase tracking-widest text-mutedText mb-1">
                                Refund Amount
                              </h3>
                              <p className="text-sm text-neon-green font-mono font-bold">
                                ₹
                                {Number(ret.refund_amount).toLocaleString(
                                  "en-IN"
                                )}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                              <label className="text-xs font-medium uppercase tracking-wider text-mutedText block mb-2">
                                Refund Amount (₹)
                              </label>
                              <input
                                type="number"
                                value={refundAmount}
                                onChange={(e) =>
                                  setRefundAmount(e.target.value)
                                }
                                placeholder="0"
                                className="w-full h-10 rounded border border-borderDark bg-surface px-3 text-sm text-primaryText placeholder:text-mutedText/40 focus:outline-none focus:border-neon-cyan"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium uppercase tracking-wider text-mutedText block mb-2">
                                Admin Notes
                              </label>
                              <input
                                value={adminNotes}
                                onChange={(e) =>
                                  setAdminNotes(e.target.value)
                                }
                                placeholder="Internal notes..."
                                className="w-full h-10 rounded border border-borderDark bg-surface px-3 text-sm text-primaryText placeholder:text-mutedText/40 focus:outline-none focus:border-neon-cyan"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            {ret.status === "requested" && (
                              <>
                                <button
                                  onClick={() =>
                                    updateReturn(ret.id, "approved")
                                  }
                                  disabled={updating === ret.id}
                                  className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 text-xs uppercase font-bold rounded hover:bg-neon-cyan/30 transition-colors disabled:opacity-50"
                                >
                                  {updating === ret.id
                                    ? "Updating..."
                                    : "Approve"}
                                </button>
                                <button
                                  onClick={() =>
                                    updateReturn(ret.id, "rejected")
                                  }
                                  disabled={updating === ret.id}
                                  className="px-4 py-2 bg-danger/20 text-danger border border-danger/50 text-xs uppercase font-bold rounded hover:bg-danger/30 transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {ret.status === "approved" && (
                              <button
                                onClick={() =>
                                  updateReturn(ret.id, "completed")
                                }
                                disabled={updating === ret.id}
                                className="px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/50 text-xs uppercase font-bold rounded hover:bg-neon-green/30 transition-colors disabled:opacity-50"
                              >
                                {updating === ret.id
                                  ? "Updating..."
                                  : "Mark Completed"}
                              </button>
                            )}
                            {(ret.status === "rejected" ||
                              ret.status === "completed") && (
                              <span className="text-xs text-mutedText italic py-2">
                                This return has been {ret.status}.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
