<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Services\Items\CsvDelimiterDetector;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ImportPreviewRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness();
    }

    public function rules(): array
    {
        $delimiterDetector = app(CsvDelimiterDetector::class);

        return [
            'file' => ['nullable', 'file', 'mimes:csv,txt', 'max:20480'],
            'preview_id' => ['nullable', 'string'],
            'delimiter' => ['nullable', Rule::in($delimiterDetector->allowedDelimiters())],
            'lowercase_headers' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $isPreviewFull = $this->routeIs('*.items-import.preview.full')
                || str_contains((string) $this->path(), 'items-import/preview/full');

            if ($isPreviewFull) {
                if (! $this->hasFile('file') && ! $this->filled('preview_id')) {
                    $validator->errors()->add('preview_id', 'Provide preview_id or file for import preview.');
                }

                return;
            }

            if (! $this->hasFile('file')) {
                $validator->errors()->add('file', 'The file field is required.');
            }
        });
    }
}
