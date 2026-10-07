import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, Tag, Check, AlertCircle } from 'lucide-react';

const SUGGESTED_TAGS = [
  'VIP',
  'Progressive',
  'Single Vision',
  'Bifocal',
  'Contact Lens',
  'Kids Eyewear',
  'Senior Citizen',
  'Corporate',
  'High Index',
  'Blue-Cut User',
];

const CATEGORIES = [
  { value: 'REGULAR', label: 'Regular Customer' },
  { value: 'VIP', label: 'VIP / Premium Buyer' },
  { value: 'WALK_IN', label: 'Walk-in / Occasional' },
  { value: 'CORPORATE', label: 'Corporate Account' },
];

export default function BulkTagModal({ isOpen, onClose, selectedCustomerIds = [], onTagsUpdated }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e) => {
    e?.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleApply = async () => {
    setError('');
    if (selectedTags.length === 0 && !category) {
      setError('Please select at least one tag or category to assign.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/customers/bulk-tags', {
        customerIds: selectedCustomerIds,
        tagsToAdd: selectedTags,
        category: category || undefined,
      });

      if (onTagsUpdated) onTagsUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update customer tags.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E7E3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202D2B]">Assign Tags &amp; Category</h3>
              <p className="text-xs text-[#66746F]">Applying to {selectedCustomerIds.length} selected customer(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#66746F] hover:bg-[#F5F7F3]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Category dropdown */}
          <div>
            <label className="block text-xs font-bold text-[#202D2B] uppercase tracking-wider mb-1.5">
              Customer Tier / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B]"
            >
              <option value="">Keep current category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#202D2B] uppercase tracking-wider">
              Select Tags to Add
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-[#28766B] text-white border-[#28766B]'
                        : 'bg-white text-[#202D2B] border-[#E2E7E3] hover:bg-[#F5F7F3]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag input */}
            <form onSubmit={handleAddCustomTag} className="flex gap-2 pt-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Or type a custom tag name..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30"
              />
              <button
                type="submit"
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                + Add
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E7E3] bg-[#F5F7F3] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleApply}
            className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Applying…' : 'Apply Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
