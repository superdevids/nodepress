import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const contentReadTrend = new Trend('content_read_duration');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 50 },   // Ramp up to 50
    { duration: '3m', target: 100 },  // Ramp up to 100
    { duration: '2m', target: 100 },  // Stay at 100
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('content_read', () => {
    const res = http.get(`${BASE_URL}/api/content/post?limit=10`);
    check(res, { 'status is 200': (r) => r.status === 200 });
    contentReadTrend.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  group('health_check', () => {
    const res = http.get(`${BASE_URL}/api/healthz`);
    check(res, { 'health is ok': (r) => r.status === 200 });
  });

  sleep(1);
}
