<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ticket Venta #{{ $ticket['id'] }}</title>
    <style>
        @page {
            margin: 4mm;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #111;
        }

        .ticket {
            width: 72mm;
            margin: 0 auto;
        }

        .center { text-align: center; }
        .right { text-align: right; }
        .muted { color: #666; }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 3px 0;
            vertical-align: top;
        }

        .separator {
            border-top: 1px dashed #888;
            margin: 8px 0;
        }

        .total {
            font-size: 14px;
            font-weight: bold;
        }
    </style>
</head>
<body>
<div class="ticket">
    <div class="center">
        <strong>{{ $ticket['business']['name'] ?? 'Negocio' }}</strong><br>
        <span class="muted">{{ $ticket['business']['address'] ?? '' }}</span><br>
        <span class="muted">Tel: {{ $ticket['business']['phone'] ?? '-' }}</span><br>
        <span class="muted">CUIT: {{ $ticket['business']['tax_id'] ?? '-' }}</span>
    </div>

    <div class="separator"></div>

    <div>
        <strong>Ticket #{{ $ticket['id'] }}</strong><br>
        Fecha: {{ $ticket['date']['created_at'] ?? '-' }}<br>
        Vendedor: {{ $ticket['seller']['name'] ?? '-' }}<br>
        Caja: {{ $ticket['cash_register']['session_id'] ?? '-' }}
    </div>

    <div class="separator"></div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="right">Cant</th>
                <th class="right">P.Unit</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($ticket['items'] as $item)
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="right">{{ $item['quantity'] }}</td>
                    <td class="right">{{ number_format($item['unit_price'], 2, ',', '.') }}</td>
                    <td class="right">{{ number_format($item['total'], 2, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="separator"></div>

    <table>
        @foreach($ticket['payments'] as $payment)
            <tr>
                <td>{{ $payment['method'] ?? 'Pago' }} ({{ $payment['status'] }})</td>
                <td class="right">{{ number_format($payment['amount'], 2, ',', '.') }}</td>
            </tr>
        @endforeach
    </table>

    <div class="separator"></div>

    <div class="total right">
        TOTAL: {{ number_format($ticket['total']['amount'], 2, ',', '.') }}
    </div>

    <p class="center muted">Gracias por su compra</p>
</div>
</body>
</html>
