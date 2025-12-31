/**
 * Dialog Component
 * Wrapper around Modal with footer support
 */

import React from 'react';
import { Modal, type ModalProps } from '../Modal';

export interface DialogProps extends ModalProps {
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  footer,
  children,
  ...rest
}) => {
  return (
    <Modal {...rest}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && (
          <div className="border-t border-gray-300 dark:border-gray-700 p-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Dialog;
