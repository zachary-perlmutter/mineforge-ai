# ── S3 bucket for the React static build ─────────────────────────────────────

resource "aws_s3_bucket" "web" {
  bucket = "mineforge-ai-web-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── CloudFront Origin Access Control (modern replacement for OAI) ─────────────

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "mineforge-web-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── S3 bucket policy — only CloudFront can read ───────────────────────────────

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.web.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.web.arn
        }
      }
    }]
  })
}

# ── CloudFront distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US + EU only — cheapest

  # Origin 1: S3 (React app)
  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-web"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  # Origin 2: K3s API (FastAPI on NodePort 30090)
  origin {
    domain_name = aws_instance.k3s_server.public_dns
    origin_id   = "api"
    custom_origin_config {
      http_port              = 30090
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior: serve React app from S3
  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    # Don't cache index.html so deploys take effect immediately
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.no_cache_html.arn
    }
  }

  # /api/* behavior: forward to FastAPI
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api"
    viewer_protocol_policy = "allow-all"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Content-Type", "Accept", "Authorization"]
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # SPA fallback — return index.html for 403/404 so React Router handles routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# CloudFront function to set no-cache on HTML responses
resource "aws_cloudfront_function" "no_cache_html" {
  name    = "mineforge-no-cache-html"
  runtime = "cloudfront-js-2.0"
  code    = <<-EOF
    function handler(event) {
      var response = event.response;
      var headers = response.headers;
      var uri = event.request.uri;
      if (uri.endsWith('.html') || uri === '/') {
        headers['cache-control'] = { value: 'no-cache, no-store, must-revalidate' };
      }
      return response;
    }
  EOF
}

data "aws_caller_identity" "current" {}
