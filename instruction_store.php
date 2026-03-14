<?php

function instruction_dir_path(): string {
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'instructions';
    if (!is_dir($path)) {
        @mkdir($path, 0777, true);
    }
    return $path;
}

function normalize_instruction_filename(string $name): string {
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

function instruction_node_id(string $filename): string {
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $base));
    $slug = trim((string) $slug, '_');
    return 'instruction_file_' . ($slug !== '' ? $slug : 'instruction');
}

function list_instruction_files_meta(): array {
    $dir = instruction_dir_path();
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
            'nodeId' => instruction_node_id($filename),
            'content' => (string) file_get_contents($filePath),
        ];
    }
    usort($result, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
    return $result;
}

function get_instruction_meta(string $name): ?array {
    $filename = normalize_instruction_filename($name);
    if ($filename === '') {
        return null;
    }
    foreach (list_instruction_files_meta() as $instruction) {
        if (strcasecmp($instruction['name'], $filename) === 0) {
            return $instruction;
        }
    }
    return null;
}

function write_instruction_file(string $name, string $content): array {
    $filename = normalize_instruction_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid instruction file name'];
    }
    $path = instruction_dir_path() . DIRECTORY_SEPARATOR . $filename;
    file_put_contents($path, $content);
    return get_instruction_meta($filename) ?? [
        'name' => $filename,
        'title' => pathinfo($filename, PATHINFO_FILENAME),
        'nodeId' => instruction_node_id($filename),
        'content' => $content,
    ];
}

function create_instruction_file(string $name, string $content): array {
    $filename = normalize_instruction_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid instruction file name'];
    }
    $path = instruction_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (file_exists($path)) {
        return ['error' => 'Instruction file already exists'];
    }
    return write_instruction_file($filename, $content);
}

function update_instruction_file(string $name, string $content): array {
    $filename = normalize_instruction_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid instruction file name'];
    }
    $path = instruction_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (!file_exists($path)) {
        return ['error' => 'Instruction file not found'];
    }
    return write_instruction_file($filename, $content);
}

function delete_instruction_file_by_name(string $name): array {
    $filename = normalize_instruction_filename($name);
    if ($filename === '') {
        return ['error' => 'Invalid instruction file name'];
    }
    $path = instruction_dir_path() . DIRECTORY_SEPARATOR . $filename;
    if (!file_exists($path)) {
        return ['error' => 'Instruction file not found'];
    }
    unlink($path);
    return [
        'deleted' => true,
        'name' => $filename,
        'nodeId' => instruction_node_id($filename),
    ];
}
