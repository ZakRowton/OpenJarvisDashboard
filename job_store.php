<?php

function jobs_dir_path(): string {
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'jobs';
    if (!is_dir($path)) {
        @mkdir($path, 0777, true);
    }
    return $path;
}

function normalize_job_filename(string $name): string {
    $name = trim(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $name));
    $name = basename($name);
    if ($name === '') {
        return '';
    }
    if (strtolower(substr($name, -3)) !== '.md') {
        $name .= '.md';
    }
    return $name;
}

function job_node_id(string $filename): string {
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $base));
    $slug = trim((string) $slug, '_');
    return 'job_file_' . ($slug !== '' ? $slug : 'job');
}

function list_job_files_meta(): array {
    $dir = jobs_dir_path();
    if (!is_dir($dir)) {
        return [];
    }
    $files = glob($dir . DIRECTORY_SEPARATOR . '*.md') ?: [];
    $result = [];
    foreach ($files as $filePath) {
        $filename = basename($filePath);
        $result[] = [
            'name' => $filename,
            'title' => pathinfo($filename, PATHINFO_FILENAME),
            'nodeId' => job_node_id($filename),
            'content' => (string) file_get_contents($filePath),
        ];
    }
    usort($result, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
    return $result;
}

function get_job_meta(string $name): ?array {
    $filename = normalize_job_filename($name);
    if ($filename === '') {
        return null;
    }
    foreach (list_job_files_meta() as $job) {
        if (strcasecmp($job['name'], $filename) === 0) {
            return $job;
        }
    }
    return null;
}

function write_job_file(string $name, string $content): array {
    $filename = normalize_job_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid job file name'];
    }
    $path = jobs_dir_path() . DIRECTORY_SEPARATOR . $filename;
    file_put_contents($path, $content);
    return get_job_meta($filename) ?? [
        'name' => $filename,
        'title' => pathinfo($filename, PATHINFO_FILENAME),
        'nodeId' => job_node_id($filename),
        'content' => $content,
    ];
}

function create_job_file(string $name, string $content): array {
    $filename = normalize_job_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid job file name'];
    }
    $path = jobs_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (file_exists($path)) {
        return ['error' => 'Job file already exists'];
    }
    return write_job_file($filename, $content);
}

function update_job_file(string $name, string $content): array {
    $filename = normalize_job_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid job file name'];
    }
    $path = jobs_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (!file_exists($path)) {
        return ['error' => 'Job file not found'];
    }
    return write_job_file($filename, $content);
}

function delete_job_file_by_name(string $name): array {
    $filename = normalize_job_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid job file name'];
    }
    $path = jobs_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (!file_exists($path)) {
        return ['error' => 'Job file not found'];
    }
    unlink($path);
    return [
        'deleted' => true,
        'name' => $filename,
        'nodeId' => job_node_id($filename),
    ];
}
