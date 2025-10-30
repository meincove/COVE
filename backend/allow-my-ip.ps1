# Auto-allow current public IPv4 on RDS SG for port 5432
$ErrorActionPreference = "Stop"

# ---- CONFIG ----
$SG   = "sg-002569837d4b3b6db"   # exact ID from AWS
$REG  = "eu-central-1"
$PORT = 5432
$AWS  = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
# ---------------

function Get-MyIPv4 {
  try { return (Invoke-RestMethod -Uri "https://api.ipify.org").Trim() } catch {}
  try { return (Invoke-RestMethod -Uri "http://ipv4.icanhazip.com").Trim() } catch {}
  throw "Could not determine public IPv4"
}
$ip   = Get-MyIPv4
$cidr = "$ip/32"
Write-Host "My IPv4: $ip"

$sgJson  = & $AWS ec2 describe-security-groups --group-ids $SG --region $REG | ConvertFrom-Json
$ingress = $sgJson.SecurityGroups[0].IpPermissions | Where-Object {
  $_.IpProtocol -eq "tcp" -and $_.FromPort -eq $PORT -and $_.ToPort -eq $PORT
}

foreach ($perm in $ingress) {
  foreach ($range in $perm.IpRanges) {
    & $AWS ec2 revoke-security-group-ingress --group-id $SG --protocol tcp --port $PORT --cidr $range.CidrIp --region $REG | Out-Null
  }
}

& $AWS ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port $PORT --cidr $cidr --region $REG | Out-Null
Write-Host "Allowed $cidr on port $PORT for $SG"
