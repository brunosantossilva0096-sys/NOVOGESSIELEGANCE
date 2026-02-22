import React, { useState, useEffect } from 'react';
import { FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../services';
import type { StorePolicy } from '../services/database';
import { theme } from '../theme';

interface StorePoliciesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorePolicies: React.FC<StorePoliciesProps> = ({ isOpen, onClose }) => {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPolicies();
    }
  }, [isOpen]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const policiesData = await db.getPolicies();
      setPolicies(policiesData);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePolicy = (policyId: string) => {
    setExpandedPolicy(expandedPolicy === policyId ? null : policyId);
  };

  const formatPolicyContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.trim() === '') return <br key={index} />;
      
      // Check if it's a heading (starts with number and dot)
      if (/^\d+\./.test(line.trim())) {
        return (
          <h3 key={index} className="font-bold text-lg mt-4 mb-2 text-gray-900">
            {line.trim()}
          </h3>
        );
      }
      
      // Check if it's a bullet point (starts with • or -)
      if (/^[•\-\*]/.test(line.trim())) {
        return (
          <li key={index} className="ml-4 mb-1 text-gray-700">
            {line.trim().replace(/^[•\-\*]\s*/, '')}
          </li>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="mb-2 text-gray-700 leading-relaxed">
          {line.trim()}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        style={{ boxShadow: theme.shadows.xl }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Políticas da Loja</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma política disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => togglePolicy(policy.id)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                  >
                    <h3 className="font-semibold text-gray-900">{policy.title}</h3>
                    {expandedPolicy === policy.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedPolicy === policy.id && (
                    <div className="p-4 bg-white">
                      <div className="prose prose-sm max-w-none">
                        {formatPolicyContent(policy.content)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Ao realizar uma compra, você declara ter lido e concordado com todas as políticas da loja.
          </p>
        </div>
      </div>
    </div>
  );
};
