import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    // --- Modal Backdrop ---
    // MODIFIED: Added backdrop-blur-sm and changed bg-opacity-60 to bg-opacity-50
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      {/* --- Modal Content --- */}
      <div 
        className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full" // Removed text-center
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-slate-800">{title}</h2>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;