<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class ItemsImportCompleted extends Notification
{
    use Queueable;

    public function __construct(
        private array $result,
        private string $importId
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'import_id' => $this->importId,
            'title' => 'Importación completada',
            'message' => sprintf(
                'Se procesaron %d items: %d creados, %d actualizados, %d omitidos',
                $this->result['total_processed'] ?? 0,
                $this->result['created'] ?? 0,
                $this->result['updated'] ?? 0,
                $this->result['skipped'] ?? 0
            ),
            'result' => $this->result,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}