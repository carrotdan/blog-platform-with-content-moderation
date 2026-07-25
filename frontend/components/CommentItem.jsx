import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import CommentForm from './CommentForm';
import ReportModal from './ReportModal';
import { useAuth } from '../hooks/useAuth';

export default function CommentItem({ comment, onReplyAdded }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { isAuthenticated } = useAuth();

  // is_hidden: bị ẩn hoàn toàn → không render
  if (comment.is_hidden) return null;

  const isToxic = comment.label === 'TOXIC';
  const showSensitive = comment.is_sensitive && !revealed;

  return (
    <div className={`mt-4 border-l-2 border-gray-100 pl-4 ${comment.depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex items-center space-x-2 mb-1">
        <span className="font-semibold text-sm text-gray-900">{comment.author?.username || 'Unknown'}</span>
        <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>

        {/* Toxic badge (không blur, chỉ hiện badge cảnh báo nhỏ) */}
        {isToxic && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Có thể không phù hợp
          </span>
        )}

        {comment.is_sensitive && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Nhạy cảm
          </span>
        )}
      </div>

      {/* Nội dung hiển thị thẳng hoặc bị blur */}
      {showSensitive ? (
        <div className="mt-1 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-400 italic">Bình luận chứa nội dung nhạy cảm.</p>
          <button 
            onClick={() => setRevealed(true)} 
            className="text-xs text-amber-600 hover:text-amber-700 font-bold whitespace-nowrap active:scale-95 transition-all"
          >
            Hiển thị
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-800 leading-relaxed">{comment.content}</p>
      )}

      <div className="mt-2 flex items-center space-x-4">
        {comment.depth < 3 && (
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-xs text-gray-500 hover:text-gray-900 font-medium"
          >
            Reply
          </button>
        )}
        <button
          onClick={() => {
            if (!isAuthenticated) return alert('Please login first');
            setIsReportModalOpen(true);
          }}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Report</span>
        </button>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={comment._id}
        targetModel="Comment"
      />

      {showReplyForm && (
        <div className="mt-3">
          <CommentForm
            postId={comment.post_id}
            parentId={comment._id}
            onSuccess={() => {
              setShowReplyForm(false);
              if (onReplyAdded) onReplyAdded();
            }}
          />
        </div>
      )}
    </div>
  );
}
