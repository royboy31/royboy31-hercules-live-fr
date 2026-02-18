<?php
/**
 * Batch convert product images to WebP format.
 * Creates .png.webp files alongside existing PNGs (appended format).
 * This matches the format the product sync worker expects.
 *
 * Usage: php convert-to-webp.php [--dry-run]
 */

$uploads_dir = '/var/www/vhosts/hercules-merchandise.co.uk/staging.hercules-merchandise.co.uk/wp-content/uploads';
$dry_run = in_array('--dry-run', $argv ?? []);
$quality = 80; // WebP quality (80 = good balance of size/quality)

$sizes_to_convert = [
    '-361x361.png',
    '-100x100.png',
];

$converted = 0;
$skipped = 0;
$errors = 0;
$total_saved = 0;

foreach ($sizes_to_convert as $size_suffix) {
    echo "\n=== Converting *{$size_suffix} ===\n";

    $pattern = $uploads_dir . '/*/*' . $size_suffix;
    // Use recursive glob for year/month subfolders
    $files = [];
    foreach (glob($uploads_dir . '/20*', GLOB_ONLYDIR) as $year_dir) {
        foreach (glob($year_dir . '/*', GLOB_ONLYDIR) as $month_dir) {
            foreach (glob($month_dir . '/*' . $size_suffix) as $file) {
                $files[] = $file;
            }
        }
    }

    $total = count($files);
    echo "Found {$total} files\n";

    foreach ($files as $i => $png_path) {
        $webp_path = $png_path . '.webp';

        // Skip if WebP already exists
        if (file_exists($webp_path)) {
            $skipped++;
            continue;
        }

        if ($dry_run) {
            echo "[DRY RUN] Would convert: " . basename($png_path) . "\n";
            $converted++;
            continue;
        }

        // Load PNG
        $img = @imagecreatefrompng($png_path);
        if (!$img) {
            // Try JPEG in case file extension doesn't match
            $img = @imagecreatefromjpeg($png_path);
        }
        if (!$img) {
            echo "ERROR: Cannot load: " . basename($png_path) . "\n";
            $errors++;
            continue;
        }

        // Preserve transparency
        imagepalettetotruecolor($img);
        imagealphablending($img, true);
        imagesavealpha($img, true);

        // Save as WebP
        if (imagewebp($img, $webp_path, $quality)) {
            $original_size = filesize($png_path);
            $webp_size = filesize($webp_path);
            $saved = $original_size - $webp_size;
            $total_saved += $saved;
            $converted++;

            // Progress every 100 files
            if ($converted % 100 === 0) {
                echo "Progress: {$converted}/{$total} converted\n";
            }
        } else {
            echo "ERROR: Failed to save WebP: " . basename($png_path) . "\n";
            $errors++;
        }

        imagedestroy($img);
    }
}

echo "\n=== Summary ===\n";
echo "Converted: {$converted}\n";
echo "Skipped (already exist): {$skipped}\n";
echo "Errors: {$errors}\n";
echo "Total space saved: " . round($total_saved / 1024 / 1024, 2) . " MB\n";
echo "Done.\n";
