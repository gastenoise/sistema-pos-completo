import React, { useState } from 'react';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import TicketPreviewDialog from '@/components/sales/TicketPreviewDialog';

export default function TicketActions({ saleId, customerEmail, className = '' }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isDisabled = !saleId;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
        <Button type="button" onClick={() => setIsPreviewOpen(true)} disabled={isDisabled}>
          <Eye className="mr-2 h-4 w-4" />
          Ver ticket
        </Button>
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
