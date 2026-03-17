<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>System Health - {{ config('app.name', 'Laravel') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
    <style>
        :root {
            --font-sans: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            --color-bg: #FDFDFC;
            --color-text: #1b1b18;
            --color-border: #19140035;
            --color-success: #22c55e;
            --color-danger: #ef4444;
            --color-muted: #706f6c;
            --color-card: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --color-bg: #0a0a0a;
                --color-text: #EDEDEC;
                --color-border: #3E3E3A;
                --color-muted: #A1A09A;
                --color-card: #161615;
            }
        }
        body {
            font-family: var(--font-sans);
            background-color: var(--color-bg);
            color: var(--color-text);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
            background-color: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--color-border);
        }
        .title {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0;
        }
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-ok { background-color: rgba(34, 197, 94, 0.1); color: var(--color-success); border: 1px solid var(--color-success); }
        .status-unhealthy { background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid var(--color-danger); }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .item {
            display: flex;
            flex-direction: column;
        }
        .label {
            font-size: 0.75rem;
            color: var(--color-muted);
            margin-bottom: 0.25rem;
        }
        .value {
            font-size: 0.875rem;
            font-weight: 500;
        }
        .check {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-top: 1px solid var(--color-border);
        }
        .check-status {
            font-size: 0.75rem;
            font-weight: 600;
        }
        .up { color: var(--color-success); }
        .down { color: var(--color-danger); }
        .footer {
            margin-top: 1rem;
            font-size: 0.75rem;
            color: var(--color-muted);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">System Health</h1>
            <span class="status-badge {{ $status === 'ok' ? 'status-ok' : 'status-unhealthy' }}">
                {{ $status }}
            </span>
        </div>

        <div class="grid">
            <div class="item">
                <span class="label">Environment</span>
                <span class="value">{{ $environment }}</span>
            </div>
            <div class="item">
                <span class="label">PHP Version</span>
                <span class="value">{{ $versions['php'] }}</span>
            </div>
            <div class="item">
                <span class="label">Laravel</span>
                <span class="value">{{ $versions['laravel'] }}</span>
            </div>
            <div class="item">
                <span class="label">Time</span>
                <span class="value">{{ now()->format('H:i:s') }}</span>
            </div>
        </div>

        <div class="check">
            <span class="label">Database</span>
            <span class="check-status {{ $checks['database'] === 'up' ? 'up' : 'down' }}">
                ● {{ strtoupper($checks['database']) }}
            </span>
        </div>
        <div class="check">
            <span class="label">Cache</span>
            <span class="check-status {{ $checks['cache'] === 'up' ? 'up' : 'down' }}">
                ● {{ strtoupper($checks['cache']) }}
            </span>
        </div>

        <div class="footer">
            {{ $timestamp }}
        </div>
    </div>
</body>
</html>
