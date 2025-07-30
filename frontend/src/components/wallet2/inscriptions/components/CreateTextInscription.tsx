import React from 'react';

interface CreateTextInscriptionProps {
  textData: string;
  setTextData: (text: string) => void;
}

export const CreateTextInscription: React.FC<CreateTextInscriptionProps> = ({
  textData,
  setTextData
}) => {
  const textSize = new TextEncoder().encode(textData).length;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Text Message
      </label>
      <textarea
        value={textData}
        onChange={(e) => setTextData(e.target.value)}
        placeholder="Enter your message..."
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
        rows={4}
      />
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-400">
          {textData.length} characters
        </p>
        <p className="text-xs text-gray-400">
          {textSize} bytes
        </p>
      </div>
      
      {textSize > 100000 && (
        <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-300">
          ⚠️ Large text detected. This will require higher fees.
        </div>
      )}
    </div>
  );
};