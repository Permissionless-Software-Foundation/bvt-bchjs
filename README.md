# bvt-rest

This is the Build Verification Test (BVT) system for FullStack.cash. It's an automated testing system that runs through every possible test. It runs tests in this order:

- Liveness Tests
- Unit Tests
- Integration Tests
- End to end tests

## Installation

- Clone this repository
- npm install dependencies
- The repository includes the following directories by default (and `npm install` also ensures they exist):
  - uut
  - private
  - bkup

- Place shell scripts in the `private` directory that will be run when testing bch-api. These shell scripts should set the environment variables required to connect bch-api to its underlying infrastructure.

- [Install Redis](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04) in order to run bch-api tests.

## Environment Variables

### `IGNORED_CLIENT_IP_PATTERNS`

The BCHN log analyzer supports filtering out local/internal traffic by client IP before computing summary metrics.

- Format: comma-separated list of IPv4 patterns.
- Supported pattern types:
  - Exact IPs, e.g. `172.20.0.1`
  - Wildcards with `*`, e.g. `192.168.0.*` or `172.10.*.*`
- Matching is performed against `client_ip` and `remote_address` values in the parsed JSON log entries.

Example:

```bash
export IGNORED_CLIENT_IP_PATTERNS="192.168.0.*,172.10.*.*,172.20.0.1"
```

If unset, the default patterns are:

- `192.168.0.*`
- `172.10.*.*`
