import React, { useState } from 'react';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import TicketPreviewDialog from '@/components/sales/TicketPreviewDialog';

export default function TicketActions({ saleId, customerEmail, className = '', rightActions }: any) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isDisabled = !saleId;

  return (
    <>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`.trim()}>
        <Button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          disabled={isDisabled}
          className="w-full sm:w-auto"
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver ticket
        </Button>

        {rightActions && (
          <div className="w-full sm:w-auto">
            {rightActions}
          </div>
        )}
      </div>

      <TicketPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        saleId={saleId}
        customerEmail={customerEmail}
      />
    </>
  );
}
