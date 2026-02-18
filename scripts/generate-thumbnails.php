<?php
/**
 * WordPress Product Image Thumbnail Generator
 *
 * This script generates missing thumbnail sizes (-300x300, -600x600)
 * and converts them to WebP format for all product images.
 *
 * Usage:
 * 1. Upload to WordPress root or wp-content folder
 * 2. Run via CLI: php generate-thumbnails.php
 * 3. Or run via browser with admin access
 */

// Load WordPress
if (file_exists('./wp-load.php')) {
    require_once('./wp-load.php');
} elseif (file_exists('../wp-load.php')) {
    require_once('../wp-load.php');
} elseif (file_exists('../../wp-load.php')) {
    require_once('../../wp-load.php');
} else {
    die('WordPress not found. Please place this script in WordPress root directory.');
}

// Check if running from CLI or browser
$is_cli = php_sapi_name() === 'cli';

// Security check for browser access
if (!$is_cli && !current_user_can('manage_options')) {
    wp_die('You must be an administrator to run this script.');
}

// Set time limit for long operations
set_time_limit(0);
ini_set('memory_limit', '512M');

// Output helper
function output($message, $is_cli = false) {
    if ($is_cli) {
        echo $message . "\n";
    } else {
        echo $message . "<br>\n";
        ob_flush();
        flush();
    }
}

// Get upload directory info
$upload_dir = wp_upload_dir();
$base_dir = $upload_dir['basedir'];

output("=== WordPress Product Image Thumbnail Generator ===", $is_cli);
output("Upload directory: $base_dir", $is_cli);
output("", $is_cli);

// Thumbnail sizes to generate
$sizes = [
    '300x300' => ['width' => 300, 'height' => 300, 'crop' => true],
    '600x600' => ['width' => 600, 'height' => 600, 'crop' => true],
];

// Get all product images from WooCommerce
$args = [
    'post_type' => 'product',
    'posts_per_page' => -1,
    'post_status' => 'publish',
    'fields' => 'ids',
];

$product_ids = get_posts($args);
output("Found " . count($product_ids) . " products", $is_cli);

$stats = [
    'products_processed' => 0,
    'images_found' => 0,
    'thumbnails_created' => 0,
    'webp_created' => 0,
    'already_exists' => 0,
    'errors' => 0,
];

// Check if GD or Imagick is available
$image_editor = wp_get_image_editor(ABSPATH . 'wp-includes/images/blank.gif');
if (is_wp_error($image_editor)) {
    output("WARNING: No image editor available. Please enable GD or Imagick.", $is_cli);
}

// Process each product
foreach ($product_ids as $product_id) {
    $product = wc_get_product($product_id);
    if (!$product) continue;

    $stats['products_processed']++;

    // Get all image IDs (featured + gallery)
    $image_ids = [];

    // Featured image
    $featured_id = $product->get_image_id();
    if ($featured_id) {
        $image_ids[] = $featured_id;
    }

    // Gallery images
    $gallery_ids = $product->get_gallery_image_ids();
    $image_ids = array_merge($image_ids, $gallery_ids);

    if (empty($image_ids)) continue;

    $product_name = $product->get_name();
    output("Processing: $product_name (ID: $product_id) - " . count($image_ids) . " images", $is_cli);

    foreach ($image_ids as $image_id) {
        $stats['images_found']++;

        // Get the full path to the original image
        $original_path = get_attached_file($image_id);
        if (!$original_path || !file_exists($original_path)) {
            output("  - Image ID $image_id: Original file not found", $is_cli);
            $stats['errors']++;
            continue;
        }

        $path_info = pathinfo($original_path);
        $dir = $path_info['dirname'];
        $filename = $path_info['filename'];
        $extension = strtolower($path_info['extension']);

        // Skip non-image files
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
            continue;
        }

        // Generate each thumbnail size
        foreach ($sizes as $size_name => $size_config) {
            $thumb_filename = "{$filename}-{$size_name}.{$extension}";
            $thumb_path = "{$dir}/{$thumb_filename}";
            $webp_path = "{$dir}/{$filename}-{$size_name}.webp";

            // Check if thumbnail already exists
            if (file_exists($thumb_path)) {
                $stats['already_exists']++;
            } else {
                // Create thumbnail using WordPress image editor
                $editor = wp_get_image_editor($original_path);

                if (is_wp_error($editor)) {
                    output("  - Error loading image: " . $editor->get_error_message(), $is_cli);
                    $stats['errors']++;
                    continue;
                }

                // Resize with crop
                $resized = $editor->resize($size_config['width'], $size_config['height'], $size_config['crop']);

                if (is_wp_error($resized)) {
                    output("  - Error resizing: " . $resized->get_error_message(), $is_cli);
                    $stats['errors']++;
                    continue;
                }

                // Set quality
                $editor->set_quality(85);

                // Save thumbnail
                $saved = $editor->save($thumb_path);

                if (is_wp_error($saved)) {
                    output("  - Error saving: " . $saved->get_error_message(), $is_cli);
                    $stats['errors']++;
                    continue;
                }

                $stats['thumbnails_created']++;
                output("  + Created: $thumb_filename", $is_cli);
            }

            // Now create WebP version if it doesn't exist
            if (!file_exists($webp_path)) {
                $source_for_webp = file_exists($thumb_path) ? $thumb_path : null;

                if ($source_for_webp && function_exists('imagewebp')) {
                    // Load the thumbnail
                    $source_image = null;

                    switch ($extension) {
                        case 'jpg':
                        case 'jpeg':
                            $source_image = @imagecreatefromjpeg($source_for_webp);
                            break;
                        case 'png':
                            $source_image = @imagecreatefrompng($source_for_webp);
                            break;
                        case 'gif':
                            $source_image = @imagecreatefromgif($source_for_webp);
                            break;
                    }

                    if ($source_image) {
                        // Preserve transparency for PNG
                        if ($extension === 'png') {
                            imagepalettetotruecolor($source_image);
                            imagealphablending($source_image, true);
                            imagesavealpha($source_image, true);
                        }

                        // Save as WebP with 85% quality
                        if (imagewebp($source_image, $webp_path, 85)) {
                            $stats['webp_created']++;
                            output("  + Created: {$filename}-{$size_name}.webp", $is_cli);
                        } else {
                            output("  - Error creating WebP", $is_cli);
                            $stats['errors']++;
                        }

                        imagedestroy($source_image);
                    }
                } elseif (!function_exists('imagewebp')) {
                    // Try using Imagick if GD doesn't support WebP
                    if (class_exists('Imagick') && file_exists($source_for_webp)) {
                        try {
                            $imagick = new Imagick($source_for_webp);
                            $imagick->setImageFormat('webp');
                            $imagick->setImageCompressionQuality(85);
                            $imagick->writeImage($webp_path);
                            $imagick->destroy();

                            $stats['webp_created']++;
                            output("  + Created (Imagick): {$filename}-{$size_name}.webp", $is_cli);
                        } catch (Exception $e) {
                            output("  - Imagick error: " . $e->getMessage(), $is_cli);
                            $stats['errors']++;
                        }
                    }
                }
            } else {
                // WebP already exists
            }
        }
    }

    // Progress update every 10 products
    if ($stats['products_processed'] % 10 === 0) {
        output("", $is_cli);
        output("Progress: {$stats['products_processed']}/" . count($product_ids) . " products processed", $is_cli);
        output("", $is_cli);
    }
}

// Final stats
output("", $is_cli);
output("=== COMPLETE ===", $is_cli);
output("Products processed: {$stats['products_processed']}", $is_cli);
output("Images found: {$stats['images_found']}", $is_cli);
output("Thumbnails created: {$stats['thumbnails_created']}", $is_cli);
output("WebP files created: {$stats['webp_created']}", $is_cli);
output("Already existed: {$stats['already_exists']}", $is_cli);
output("Errors: {$stats['errors']}", $is_cli);
