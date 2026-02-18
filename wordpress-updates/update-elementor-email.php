<?php
/**
 * Update Elementor popup (ID 5735) email_content and email_content_2
 * to match Astro contact form email template.
 *
 * Run once on the WP server, then delete.
 */

$db_name = 'wp_xpq9e';
$db_user = 'wp_5fpv9';
$db_pass = '0_Jr5A8Zj6k^0D&W';
$db_host = 'localhost';
$prefix  = 'wp_1202943_';
$post_id = 5735;

$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($mysqli->connect_error) {
    die("DB connection failed: " . $mysqli->connect_error . "\n");
}
$mysqli->set_charset('utf8mb4');

// 1. Read current _elementor_data
$sql = "SELECT meta_id, meta_value FROM {$prefix}postmeta WHERE post_id = {$post_id} AND meta_key = '_elementor_data' LIMIT 1";
$result = $mysqli->query($sql);
if (!$result || $result->num_rows === 0) {
    die("No _elementor_data found for post {$post_id}\n");
}
$row = $result->fetch_assoc();
$meta_id    = $row['meta_id'];
$raw_json   = $row['meta_value'];

// 2. Decode
$data = json_decode($raw_json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("JSON decode error: " . json_last_error_msg() . "\n");
}

// 3. New email HTML
$new_html = file_get_contents(__DIR__ . '/elementor-email-template.html');
if (!$new_html) {
    die("Could not read elementor-email-template.html\n");
}
// Trim whitespace
$new_html = trim($new_html);

// 4. Recursively find and replace email_content / email_content_2 in the JSON tree
$replaced = 0;

function walk_and_replace(&$node, $new_html, &$replaced) {
    if (is_array($node)) {
        // Check if this node has settings with email_content
        if (isset($node['settings']['email_content'])) {
            $node['settings']['email_content'] = $new_html;
            $replaced++;
            echo "  Replaced email_content in widget: " . ($node['widgetType'] ?? $node['elType'] ?? 'unknown') . "\n";
        }
        if (isset($node['settings']['email_content_2'])) {
            $node['settings']['email_content_2'] = $new_html;
            $replaced++;
            echo "  Replaced email_content_2 in widget: " . ($node['widgetType'] ?? $node['elType'] ?? 'unknown') . "\n";
        }
        // Recurse into all child arrays
        foreach ($node as $key => &$child) {
            if (is_array($child)) {
                walk_and_replace($child, $new_html, $replaced);
            }
        }
    }
}

echo "Scanning Elementor data for post {$post_id}...\n";
walk_and_replace($data, $new_html, $replaced);

if ($replaced === 0) {
    die("No email_content fields found in the Elementor data!\n");
}

echo "Total replacements: {$replaced}\n";

// 5. Backup: save original JSON to a file
$backup_file = __DIR__ . '/elementor-data-backup-' . date('Ymd-His') . '.json';
file_put_contents($backup_file, $raw_json);
echo "Backup saved: {$backup_file}\n";

// 6. Encode and update
$new_json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("JSON encode error: " . json_last_error_msg() . "\n");
}

$stmt = $mysqli->prepare("UPDATE {$prefix}postmeta SET meta_value = ? WHERE meta_id = ?");
$stmt->bind_param('si', $new_json, $meta_id);
if ($stmt->execute()) {
    echo "Database updated successfully! (meta_id: {$meta_id})\n";
} else {
    echo "Update FAILED: " . $stmt->error . "\n";
}

$stmt->close();
$mysqli->close();

echo "Done.\n";
