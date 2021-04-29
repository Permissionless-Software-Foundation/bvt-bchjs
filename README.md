# bvt-rest

This is the Build Verification Test (BVT) system for FullStack.cash. It's an automated testing system that runs through every possible test. It runs tests in this order:

- Liveness Tests
- Unit Tests
- Integration Tests
- End to end tests

## Installation

- Clone this repository
- npm install dependencies
- Create the following directories inside the repository directory:
  - uut
  - private
  - bkup

- Place shell scripts in the `private` directory that will be run when testing bch-api. These shell scripts should set the environment variables required to connect bch-api to its underlying infrastructure.

- [Install Redis](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04) in order to run bch-api tests.
