# Single Digital Gateway Performance Testing Documentation

## K6 Performance Testing

Grafana k6 is an open-source, developer-centric performance testing tool designed for engineering teams to test system reliability and speed. Written in Go but scripted in JavaScript, it supports API, microservice, and website testing through load, stress, soak, and spike scenarios. Key features include high performance, CI/CD integration, and customizable metrics.

Key features of k6 include scripting in JavaScript, high Performance for generating high load efficiently with fewer resources, supporting a wide range of protocols, easy-to-use for developer experience and automation and goal-oriented criteria using thresholds. While k6 supports a variety of testing usages, this project will primarily focus on smoke testing, load testing and stress testing.

## Install k6

k6 has packages for Linux, Mac, and Windows. Alternatively, you can use a Docker container or a standalone binary. Refer to its [website](https://grafana.com/docs/k6/latest/set-up/install-k6/) for more details.

### Linux 
#### Debian/Ubuntu
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Fedora/CentOS
Using dnf (or yum on older versions):
```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

### MacOS
Using Homebrew:
```bash
brew install k6
```

### Windows
Using the Chocolatey package manager
```bash
choco install k6
```

Using the Windows Package Manager
```bash
winget install k6 --source winget
```

## Testing Types

### Load Testing

An average-load test is a type of load testing that assesses how the system performs under typical load. Typical load might be a regular day in production or an average moment. Average-load tests simulate the number of concurrent users and requests per second that reflect average behaviors in the production environment. This type of test typically increases the throughput or VUs gradually and keeps that average load for some time. Depending on the system’s characteristics, the test may stop suddenly or have a short ramp-down period. Refer to this [beginner's guide about load testing](https://grafana.com/blog/average-load-testing/) for more details.

### Smoke Testing

Smoke tests are a load testing type that have a minimal load, and they are used to verify that the system works well under minimal load and to gather baseline performance values. This type of load testing consists of running tests with a few virtual users (VUs) fewer than 5 VUs could be considered a mini-load test. The test should execute for a short period, either a low number of iterations or a duration from seconds to a few minutes maximum. Refer to this [beginner's guide about smoke testing](https://grafana.com/blog/smoke-testing/) for more details.

### Stress Testing

Stress testing assesses how the system performs when loads are heavier than usual. The load pattern of a stress test resembles that of an average-load test. The main difference is higher load. To account for higher load, the ramp-up period takes longer in proportion to the load increase. Similarly, after the test reaches the desired load, it might last for slightly longer than it would in the average-load test. Refer to this [beginner's guide about stress testing](https://grafana.com/blog/stress-testing/) for more details.

### Comparisons

|Metrics|Load Testing| Smoke Testing| Stress Testing|
|:-:|:-:|:-:|:-:|
|Duration| short | none | long |
|VUs | moderate | few | many |
| Ramp | steady | none | rush-hour |

## Authentication

The Single Digital Gateway project uses test user credentials to sign in to its applications via BC Services Card Login development URL. Performance tests with K6 requires authentication tokens and cookies to access its frontend and backend applications. To obtain the authentication cookies, we use Cypress sign in with test username and password and store the cookies in a temporary folder. Refer to the Cypress function [`loginToObtainCookies`](/testings/cypress/cypress/support/commands.ts) for more details. Navigate to the root directory and enter the following command.

Obtain the cookies
```bash
npm run test:login
```

## Configuration

Performance testing only runs on developer's local machine. The default testing environment is the development environment. Should there be any change in the development, update the tester's IP address secret on the project's GitHub settings. Add an `.env` file in the performance folder with the variable `WEB_URL` and set its value to the development URL.

```
WEB_URL=
```

## Testing Commands 

Each type of performance test consists of two parts: API and web. Commands corresponding each type are available on the root directory. 

### Smoke Testing for Web

```bash
npm run test:smoke:web
```

### Load Testing for Web

```bash
npm run test:load:web
```

### Stress Testing for Web

```bash
npm run test:stress:web
```

## Test Reports

Test reports are available for the K6 in developers' local environments. Refer to [reports page]([./cypress.config.ts](https://grafana.com/docs/k6/latest/results-output/web-dashboard/)) for more details. NPM scripts for reports are not included in `package.json` file as generating reports varies according to requirements. Smoke tests will not generate reports as the test durations were short. Run the command below to generate a HTML report file after running either a load test or a stress test. 

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=html-report.html dotenv -e .env k6 run web.js
```

## Test Interpretation

K6 load test results will be displayed on consoles with metrics that measure the performance of the system. The end-of-test summary shows aggregated statistical values for result metrics, including median and average values, minimum and maximum values, p90, p95, and p99 values and failed rates. Below is an example of the test result.

```bash
HTTP
http_req_duration..............: avg=24.95ms  min=19.7ms   med=26.26ms  max=28.88ms  p(90)=28.36ms  p(95)=28.62ms 
  { expected_response:true }...: avg=24.95ms  min=19.7ms   med=26.26ms  max=28.88ms  p(90)=28.36ms  p(95)=28.62ms 
http_req_failed................: 0.00%  0 out of 3
http_reqs......................: 3      0.487317/s
```

`p(95)` and `http_req_failed` are two metrics that play an important role in this project. `p(95)` measures the response time for 95% of total requests, and `http_req_failed` measures the failed rate for those requests. Depending on the type of tests and real-world scenarios, the values of these metrics vary accordingly, and different thresholds are in place to ensure applications' performance surpassing minimum expectations.