<?php
/**
 * Standalone Product Image Thumbnail Generator
 *
 * Generates -300x300 and -600x600 thumbnails and converts to WebP
 * Does NOT load WordPress to avoid memory issues
 *
 * Usage: php generate-thumbnails-standalone.php
 */

// Configuration
$uploads_dir = '/var/www/vhosts/hercules-merchandise.de/staging.hercules-merchandise.de/wp-content/uploads';
$sizes = [
    '300x300' => ['width' => 300, 'height' => 300],
    '600x600' => ['width' => 600, 'height' => 600],
];

// Set limits
set_time_limit(0);
ini_set('memory_limit', '256M');

echo "=== Standalone Image Thumbnail Generator ===\n";
echo "Uploads directory: $uploads_dir\n\n";

// Stats
$stats = [
    'files_scanned' => 0,
    'thumbnails_created' => 0,
    'webp_created' => 0,
    'already_exists' => 0,
    'errors' => 0,
];

// Find all original product images (excluding thumbnails)
function findOriginalImages($dir) {
    $images = [];

    // Look in year/month subdirectories
    $years = glob($dir . '/20*', GLOB_ONLYDIR);

    foreach ($years as $year) {
        $months = glob($year . '/*', GLOB_ONLYDIR);
        foreach ($months as $month) {
            // Find images that don't have dimension suffixes
            $files = glob($month . '/*.{jpg,jpeg,png,gif}', GLOB_BRACE | GLOB_NOSORT);
            foreach ($files as $file) {
                $filename = basename($file);
                // Skip files that are already thumbnails (have -NNNxNNN pattern)
                if (!preg_match('/-\d+x\d+\./', $filename)) {
                    $images[] = $file;
                }
            }
        }
    }

    return $images;
}

/**
 * Create a cropped thumbnail
 */
function createThumbnail($source, $dest, $width, $height) {
    // Get original image info
    $info = @getimagesize($source);
    if (!$info) return false;

    $orig_width = $info[0];
    $orig_height = $info[1];
    $type = $info[2];

    // Skip if original is too small or invalid
    if ($orig_width < 1 || $orig_height < 1) {
        return false;
    }

    // Load source image
    switch ($type) {
        case IMAGETYPE_JPEG:
            $src_img = @imagecreatefromjpeg($source);
            break;
        case IMAGETYPE_PNG:
            $src_img = @imagecreatefrompng($source);
            break;
        case IMAGETYPE_GIF:
            $src_img = @imagecreatefromgif($source);
            break;
        default:
            return false;
    }

    if (!$src_img) return false;

    // Calculate crop dimensions (center crop for square)
    $src_ratio = $orig_width / $orig_height;
    $dest_ratio = $width / $height;

    if ($src_ratio > $dest_ratio) {
        // Source is wider - crop horizontally
        $crop_height = $orig_height;
        $crop_width = $orig_height * $dest_ratio;
        $crop_x = ($orig_width - $crop_width) / 2;
        $crop_y = 0;
    } else {
        // Source is taller - crop vertically
        $crop_width = $orig_width;
        $crop_height = $orig_width / $dest_ratio;
        $crop_x = 0;
        $crop_y = ($orig_height - $crop_height) / 2;
    }

    // Create destination image
    $dest_img = imagecreatetruecolor($width, $height);

    // Preserve transparency for PNG
    if ($type === IMAGETYPE_PNG) {
        imagealphablending($dest_img, false);
        imagesavealpha($dest_img, true);
        $transparent = imagecolorallocatealpha($dest_img, 255, 255, 255, 127);
        imagefilledrectangle($dest_img, 0, 0, $width, $height, $transparent);
    }

    // Resample (crop and resize)
    imagecopyresampled(
        $dest_img, $src_img,
        0, 0,                        // Dest x, y
        (int)$crop_x, (int)$crop_y,  // Src x, y
        $width, $height,             // Dest width, height
        (int)$crop_width, (int)$crop_height  // Src width, height
    );

    // Save destination image
    $ext = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'jpg':
        case 'jpeg':
            $result = imagejpeg($dest_img, $dest, 85);
            break;
        case 'png':
            $result = imagepng($dest_img, $dest, 6);
            break;
        case 'gif':
            $result = imagegif($dest_img, $dest);
            break;
        default:
            $result = false;
    }

    // Cleanup
    imagedestroy($src_img);
    imagedestroy($dest_img);

    return $result;
}

/**
 * Convert image to WebP
 */
function convertToWebP($source, $dest, $quality = 85) {
    if (!function_exists('imagewebp')) {
        return false;
    }

    $info = @getimagesize($source);
    if (!$info) return false;

    $type = $info[2];

    switch ($type) {
        case IMAGETYPE_JPEG:
            $img = @imagecreatefromjpeg($source);
            break;
        case IMAGETYPE_PNG:
            $img = @imagecreatefrompng($source);
            if ($img) {
                imagepalettetotruecolor($img);
                imagealphablending($img, true);
                imagesavealpha($img, true);
            }
            break;
        case IMAGETYPE_GIF:
            $img = @imagecreatefromgif($source);
            break;
        default:
            return false;
    }

    if (!$img) return false;

    $result = imagewebp($img, $dest, $quality);
    imagedestroy($img);

    return $result;
}

// Find all original images
echo "Scanning for original images...\n";
$images = findOriginalImages($uploads_dir);
echo "Found " . count($images) . " original images\n\n";

// Process each image
foreach ($images as $index => $image_path) {
    $stats['files_scanned']++;

    $path_info = pathinfo($image_path);
    $dir = $path_info['dirname'];
    $filename = $path_info['filename'];
    $extension = strtolower($path_info['extension']);

    // Progress every 100 images
    if ($stats['files_scanned'] % 100 === 0) {
        echo "Progress: {$stats['files_scanned']}/" . count($images) . " images processed\n";
    }

    // Generate each thumbnail size
    foreach ($sizes as $size_name => $size_config) {
        $width = $size_config['width'];
        $height = $size_config['height'];

        $thumb_filename = "{$filename}-{$size_name}.{$extension}";
        $thumb_path = "{$dir}/{$thumb_filename}";
        $webp_path = "{$dir}/{$filename}-{$size_name}.webp";

        // Create thumbnail if doesn't exist
        if (!file_exists($thumb_path)) {
            if (createThumbnail($image_path, $thumb_path, $width, $height)) {
                $stats['thumbnails_created']++;
                // Uncomment for verbose output:
                // echo "  + Created: $thumb_filename\n";
            } else {
                $stats['errors']++;
            }
        } else {
            $stats['already_exists']++;
        }

        // Create WebP version if thumbnail exists and WebP doesn't
        if (file_exists($thumb_path) && !file_exists($webp_path)) {
            if (convertToWebP($thumb_path, $webp_path)) {
                $stats['webp_created']++;
                // Uncomment for verbose output:
                // echo "  + Created: {$filename}-{$size_name}.webp\n";
            } else {
                $stats['errors']++;
            }
        }
    }

    // Memory cleanup every 50 images
    if ($stats['files_scanned'] % 50 === 0) {
        gc_collect_cycles();
    }
}

// Final stats
echo "\n=== COMPLETE ===\n";
echo "Files scanned: {$stats['files_scanned']}\n";
echo "Thumbnails created: {$stats['thumbnails_created']}\n";
echo "WebP files created: {$stats['webp_created']}\n";
echo "Already existed: {$stats['already_exists']}\n";
echo "Errors: {$stats['errors']}\n";
