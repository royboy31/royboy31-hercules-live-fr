<?php
/**
 * Admin notification template
 * Exact copy of Astro Form Handler Worker getQuantityRequestEmailHtml()
 *
 * Vars expected:
 * - $admin_mode (bool)
 * - $first_name, $surname, $customer_email, $customer_phone
 * - $billing_address (optional)
 * - $quote_post_id (int)
 * - $product_name, $product_img, $quantity_text
 * - $attributes (assoc label=>value), $addons (assoc label=>value)
 * - $page_url, $message_user
 */

$site_url  = get_site_url();
$logo_url  = $site_url . '/wp-content/plugins/pearl-wc-steps-variation/includes/mail_templates/img/logo.png';

$now  = current_time('timestamp');
$date = date_i18n('d/m/Y', $now);
$time = date_i18n('H:i:s', $now);
$full_name = trim(($first_name ?? '') . ' ' . ($surname ?? ''));

// Format attributes array to string (matches Astro: "Label: Value, Label: Value")
$attributes_str = '';
if (!empty($attributes) && is_array($attributes)) {
    $parts = [];
    foreach ($attributes as $label => $val) {
        $display = is_array($val) ? implode(', ', array_map('strval', $val)) : (string)$val;
        $parts[] = esc_html($label) . ': ' . esc_html($display);
    }
    $attributes_str = implode(', ', $parts);
}

// Format addons array to string (matches Astro: "Label: Value, Label: Value")
$addons_str = '';
if (!empty($addons) && is_array($addons)) {
    $parts = [];
    foreach ($addons as $label => $val) {
        $display = is_array($val) ? implode(', ', array_map('strval', $val)) : (string)$val;
        $parts[] = esc_html($label) . ': ' . esc_html($display);
    }
    $addons_str = implode(', ', $parts);
}
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote Request - Hercules Merchandise UK</title>
  <style>
    body { margin:0; padding:0; background:#ffffff; color:#000; font-family:Arial,sans-serif; font-size:13px; }
    .container { max-width:700px; margin:0 auto; padding:20px 16px; }
    a { color:#253461; text-decoration:none; }
    .divider { display:block; width:100%; margin:8px 0; border:2px solid #000; }
    .btn { display:inline-block; padding:10px 20px; font-weight:bold; text-decoration:none; border-radius:80px; min-width:130px; text-align:center; }
    .btn-grey { background:#e0e0e0; color:#333 !important; }
    .btn-green { background:#10C99E; color:#fff !important; }
  </style>
</head>
<body>
  <div class="container">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 10px 0;">
      <tr>
        <td style="width:50%; padding:20px 0;">
          <img src="<?php echo esc_url($logo_url); ?>" alt="Hercules Merchandise UK" style="max-width:180px; display:block;">
        </td>
        <td style="width:50%; text-align:right; padding:20px 0; font-size:14px; color:#444;">
          <span style="display:inline-block; margin-right:8px;">📧</span>
          <a href="mailto:info@hercules-merchandise.co.uk" style="color:#253461; text-decoration:none;">info@hercules-merchandise.co.uk</a><br>
          <span style="display:inline-block; margin-right:8px;">☎</span>
          <a href="tel:+442039664881" style="color:#253461; text-decoration:none;">(+44) 0203 9664881</a>
        </td>
      </tr>
    </table>

    <p>Hello <strong><?php echo esc_html($full_name); ?></strong>,</p>
    <p>Thank you for your quote request at <strong>Hercules Merchandise UK</strong>.</p>

    <!-- Customer Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 20px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Name:</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><?php echo esc_html($full_name); ?></td>
      </tr>
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Email:</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><?php echo esc_html($customer_email ?? ''); ?></td>
      </tr>
      <?php if (!empty($customer_phone)) : ?>
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Phone:</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><?php echo esc_html($customer_phone); ?></td>
      </tr>
      <?php endif; ?>
    </table>

    <!-- Product Section -->
    <h3 style="font-size:16px; margin:24px 0 10px;"><?php echo esc_html($product_name ?? 'Custom Product'); ?></h3>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <?php if ($attributes_str) : ?>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Selected Options</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;"><?php echo $attributes_str; ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($addons_str) : ?>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Add-ons</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;"><?php echo $addons_str; ?></td>
            </tr>
            <?php endif; ?>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Quantity</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;"><?php echo esc_html($quantity_text ?? ''); ?></td>
            </tr>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Price per piece</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;"><?php echo esc_html($price_per_piece ?? ''); ?></td>
            </tr>
            <?php if (!empty($desired_date)) : ?>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Desired delivery date</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;"><?php echo esc_html($desired_date); ?></td>
            </tr>
            <?php endif; ?>
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Shipping</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right; color:#10C99E;">Free</td>
            </tr>
            <tr>
              <td style="padding:4px 6px;">Setup fee</td>
              <td style="padding:4px 6px; text-align:right; color:#10C99E;">Free</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <span class="divider"></span>

    <?php if (!empty($message_user)) : ?>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:15px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc; vertical-align:top;"><strong>Additional message:</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><?php echo nl2br(esc_html($message_user)); ?></td>
      </tr>
    </table>
    <?php endif; ?>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:15px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Product link:</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><a href="<?php echo esc_url($page_url ?? ''); ?>"><?php echo esc_html($page_url ?? ''); ?></a></td>
      </tr>
      <tr>
        <td style="padding:6px 8px;"><strong>Date/Time:</strong></td>
        <td style="padding:6px 8px;"><?php echo esc_html($date); ?> at <?php echo esc_html($time); ?></td>
      </tr>
    </table>

    <!-- CTAs -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="text-align:right;">
          <a class="btn btn-green" href="<?php echo esc_url($site_url); ?>/contact-us/" style="margin-left:10px;">Contact us</a>
        </td>
      </tr>
    </table>

    <br>
    <p style="text-align:center; color:#253461; margin:0;">
      We will get back to you with a quote as soon as possible.<br>
      Hercules Merchandise terms and conditions apply.
    </p>

    <div style="background:#f5f5f5; font-size:13px; color:#777; text-align:center; padding:20px 40px; line-height:1.6; margin-top:30px;">
      <p>If you have any questions, simply reply to this email or <a href="<?php echo esc_url($site_url); ?>/contact-us/" style="color:#253461; text-decoration:none;">contact us here</a>.</p>
      <div style="margin-top:0; font-size:12px; text-align:center; color:#999;">
        <p>
          <a href="<?php echo esc_url($site_url); ?>" style="color:#253461; text-decoration:none;"><strong>Hercules Merchandise UK</strong></a>
          <strong style="color:#000;"> | </strong>
          <a href="<?php echo esc_url($site_url); ?>/terms-and-conditions/" style="color:#253461; text-decoration:none;"><strong>Terms</strong></a>
          <strong style="color:#000;"> | </strong>
          <a href="<?php echo esc_url($site_url); ?>/my-account/" style="color:#253461; text-decoration:none;"><strong>Your Account</strong></a><br>
          📧 <a href="mailto:info@hercules-merchandise.co.uk" style="color:#253461; text-decoration:none;">info@hercules-merchandise.co.uk</a><br>
          ☎ <a href="tel:+442039664881" style="color:#253461; text-decoration:none;">(+44) 0203 9664881</a><br>
          🌐 <a href="<?php echo esc_url($site_url); ?>" style="color:#253461; text-decoration:none;"><?php echo esc_html($site_url); ?></a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
