"use client";

import { useState } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { createReport } from '../services/report.service';

const PREDEFINED_REASONS = [
  "Spam or misleading",
  "Harassment or hate speech",
  "Inappropriate content",
  "Violence or harmful behavior",
  "Intellectual property violation",
  "Other"
];

export default function ReportModal({ isOpen, onClose, targetId, targetModel }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const finalReason = selectedReason === "Other" ? customReason : selectedReason;
    if (!finalReason) return alert("Please select or enter a reason");

    setLoading(true);
    try {
      await createReport({ target_id: targetId, target_model: targetModel, reason: finalReason });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReason("");
        setCustomReason("");
      }, 2000);
    } catch (error) {
      alert("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Report {targetModel}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Thank You</h4>
              <p className="text-gray-500">Your report has been submitted and will be reviewed by our team.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4 font-medium italic">Why are you reporting this?</p>
              
              <div className="grid grid-cols-1 gap-2">
                {PREDEFINED_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all border-2 ${
                      selectedReason === reason 
                        ? 'border-gray-900 bg-gray-900 text-white shadow-lg' 
                        : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {selectedReason === "Other" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please describe the issue..."
                  className="w-full mt-2 p-4 rounded-2xl border-2 border-gray-100 focus:border-gray-900 focus:outline-none text-sm transition-colors min-h-[100px] resize-none"
                />
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !selectedReason || (selectedReason === "Other" && !customReason)}
                className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
