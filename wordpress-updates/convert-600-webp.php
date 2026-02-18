<?php
/**
 * Convert missing 600x600 PNG images to WebP.
 * Creates .png.webp files (appended format).
 */

$uploads_dir = '/var/www/vhosts/hercules-merchandise.co.uk/staging.hercules-merchandise.co.uk/wp-content/uploads';
$quality = 80;
$converted = 0;
$skipped = 0;
$total_saved = 0;

$files = [];
foreach (glob($uploads_dir . '/20*', GLOB_ONLYDIR) as $year_dir) {
    foreach (glob($year_dir . '/*', GLOB_ONLYDIR) as $month_dir) {
        foreach (glob($month_dir . '/*-600x600.png') as $file) {
            $files[] = $file;
        }
    }
}

$total = count($files);
echo "Found {$total} 600x600 PNG files\n";

foreach ($files as $png_path) {
    $webp_path = $png_path . '.webp';
    if (file_exists($webp_path)) { $skipped++; continue; }

    $img = @imagecreatefrompng($png_path);
    if (!$img) { continue; }

    imagepalettetotruecolor($img);
    imagealphablending($img, true);
    imagesavealpha($img, true);

    if (imagewebp($img, $webp_path, $quality)) {
        $total_saved += filesize($png_path) - filesize($webp_path);
        $converted++;
    }
    imagedestroy($img);
}

echo "Converted: {$converted}, Skipped: {$skipped}, Saved: " . round($total_saved / 1024 / 1024, 2) . " MB\n";
