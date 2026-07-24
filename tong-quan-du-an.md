# Tổng quan dự án

Tổng hợp 4 dự án đã tham gia phát triển — mục đích, công nghệ chính và điểm nổi bật, thể hiện năng lực full-stack đa nền tảng (mobile, web, backend).

---

## 1. BonVoye — App du lịch kể chuyện theo vị trí (Flutter)

**Mục đích:** Ứng dụng du lịch trải nghiệm (location-based storytelling) — bản đồ toàn màn hình hiển thị các điểm NPC/POI, kích hoạt nội dung câu chuyện khi người dùng tiến gần vị trí thực tế (~20m). Có cơ chế "Hidden Threads" — chuỗi nhiệm vụ nhiều địa điểm. Theo đề xuất kỹ thuật mở rộng: 2 chế độ kể chuyện (audio narration + webtoon), CMS tùy biến với Visual Map Editor, Trip Planner, timeline lịch sử "Then & Now", Zalo Mini App cho thị trường Việt Nam, thanh toán qua Apple IAP/Google Play Billing.

**Công nghệ:**
- Flutter 3.44.5, Dart ^3.12.2
- `flutter_map` + `latlong2` (bản đồ), `provider` (state management)
- `google_fonts`, Material 3 theming
- Đa nền tảng: Android, iOS, Web, Windows, macOS, Linux

**Điểm nổi bật:**
- Xử lý định vị GPS/proximity detection (công thức haversine)
- Dev-mode location simulator để test mà không cần di chuyển thực tế
- Kiến trúc feature-based rõ ràng (`screens/`, `providers/`, `models/`, `widgets/`)
- Có test suite (widget + provider) và tài liệu kiến trúc nội bộ

---

## 2. GPBMT CRM — Hệ thống quản lý Giáo phận (Next.js Full-stack)

**Mục đích:** Hệ thống quản trị tài chính, nhân sự và hành chính cho Giáo phận Buôn Ma Thuột — quản lý giáo xứ/giáo dân, tài chính đa quỹ (11 loại quỹ thuộc 3 nhóm) với luồng phê duyệt giao dịch, nhân sự/lương (tự sinh giao dịch), hợp đồng cho thuê tài sản, theo dõi ân nhân đa tiền tệ, audit log, và báo cáo BI (xuất Excel/PDF).

**Công nghệ:**
- Next.js 16, React 19, TypeScript 5
- MongoDB 7 + Mongoose 8
- TanStack Query 5, TanStack Table 8
- shadcn/ui (Radix UI) + Tailwind CSS 3
- React Hook Form + Yup (validate chung client/server)
- Auth JWT tự viết (`jose`) — access token 1h + refresh token 7 ngày, httpOnly cookie, bcryptjs
- recharts (biểu đồ), `@react-pdf/renderer` (xuất PDF), Cloudinary (upload file)
- Testing: Vitest (unit + integration API)
- Deploy: Docker (multi-stage Alpine) + Docker Swarm (`stack.yml`) + GitLab CI

**Điểm nổi bật:**
- Kiến trúc layered: API Routes → Middleware → Service layer → Mongoose Models
- RBAC 5 vai trò (SuperAdmin, DioceseManager, ParishPriest, ParishAccountant, Viewer)
- Tự thực hiện migration hệ thống auth từ NextAuth sang JWT tự viết
- Xử lý tài chính đa tiền tệ, luồng phê duyệt & audit log đầy đủ
- Quy trình phát triển có tài liệu hóa chặt chẽ (PRD, architecture docs, story-by-story theo epic), CI/CD hoàn chỉnh

---

## 3. Responsum (reactnative-app) — App chăm sóc sức khỏe (React Native)

**Mục đích:** Ứng dụng cộng đồng hỗ trợ bệnh nhân (bản đang khảo sát là "Responsum for CKD" — bệnh thận mạn), theo mô hình white-label dùng lại chung codebase cho nhiều bệnh lý khác nhau (CKD, Glaucoma...). Tính năng: theo dõi triệu chứng/thuốc/bác sĩ, cộng đồng & newsfeed, thư viện tài liệu y tế, chat, thông báo, hồ sơ cá nhân.

**Công nghệ:**
- React Native 0.78.3, React 19, TypeScript
- React Navigation v6 (native-stack, bottom-tabs, top-tabs)
- Redux + redux-saga + reselect + normalizr (chuẩn hóa dữ liệu API lồng nhau)
- axios; Firebase (analytics, auth, firestore, messaging); Google/Apple/Facebook Sign-In
- Branch (deep linking), Sentry (crash reporting), Reactotron (debug)
- Camera, image crop/compress, push notification, keychain, device-info
- Jest + Testing Library; Fastlane CI/CD (staging/production, Firebase App Distribution)

**Điểm nổi bật:**
- Kiến trúc "clone app" — tái sử dụng 1 codebase để tạo nhiều app theo từng bệnh lý
- 8 patch-package vá lỗi thư viện native bên thứ 3 — kỹ năng debug native module sâu
- Từng chỉnh sửa mã Objective-C native để fix bug push notification trên iOS 14+
- Redux state chuẩn hóa (normalizr) cho dữ liệu API phức tạp
- Đa ngôn ngữ (i18n-js, react-native-localize), CI/CD phân môi trường qua Fastlane

---

## 4. HD Booking App — Customer Web (Multi-tenant SaaS Booking, Next.js)

**Mục đích:** Nền tảng đặt lịch salon/spa hướng khách hàng, đa tenant (1 deployment phục vụ nhiều thương hiệu qua domain riêng). Tính năng: đặt lịch dịch vụ, xác thực OTP, chat hỗ trợ real-time, thanh toán Stripe/VNPay, thẻ quà tặng, hồ sơ/loyalty/đánh giá, trang SEO tối ưu cho cửa hàng/dịch vụ. Ngôn ngữ mặc định tiếng Việt (thị trường VN), có hỗ trợ tiếng Anh.

**Công nghệ:**
- Next.js ^16.2.6 (App Router), React ^19.2.6, TypeScript strict
- Apollo Client ^4 + GraphQL Codegen, kèm REST SDK riêng cho auth/payment/socket
- MUI 5→9 + Tailwind CSS + twin.macro
- React Hook Form + Yup
- i18next/react-i18next + `next-i18n-router` (tự động sinh bản dịch tiếng Việt)
- Socket.io (chat real-time), Stripe + VNPay (thanh toán), Sentry (monitoring)
- Leaflet/react-leaflet (bản đồ OpenStreetMap, đã migrate khỏi Google Maps)
- Jest + Testing Library; nhiều Dockerfile cho các target deploy khác nhau + GitLab CI

**Điểm nổi bật:**
- Kiến trúc multi-tenant theo domain, tách 3 route group: marketplace / merchant / tenant
- SSR/SSG + JSON-LD structured data cho SEO trang dịch vụ/cửa hàng
- Nâng cấp bảo mật auth: chuyển từ localStorage sang HttpOnly cookie + memory-token
- Pipeline GraphQL Codegen, tìm kiếm tiếng Việt không dấu
- Đa kênh deploy (nhiều Dockerfile/docker-compose) cho các môi trường khác nhau

---

## Tổng kết năng lực

Qua 4 dự án, thể hiện khả năng làm việc **full-stack, đa nền tảng**:

| Mảng | Công nghệ đã áp dụng |
|---|---|
| Mobile | Flutter (đa nền tảng), React Native (iOS/Android native module, patch thư viện) |
| Web Frontend | Next.js (App Router), React 19, TypeScript, Tailwind/MUI/shadcn |
| Backend/API | Next.js API Routes, MongoDB/Mongoose, GraphQL (Apollo + Codegen), REST |
| State Management | Redux-saga, TanStack Query, Provider (Flutter) |
| Auth & bảo mật | JWT tự viết, OAuth (Google/Apple/Facebook), HttpOnly cookie pattern |
| Thanh toán | Stripe, VNPay, Apple IAP/Google Play Billing |
| Realtime & tích hợp | Socket.io, Firebase, Branch deep-link, Sentry |
| DevOps | Docker, Docker Swarm, GitLab CI, Fastlane |
| Đa ngôn ngữ/thị trường | i18n VN/EN, Zalo Mini App, tìm kiếm không dấu |
| Kiểm thử | Jest, Vitest, Testing Library, widget/provider test (Flutter) |

Phạm vi công việc trải rộng từ **kiến trúc hệ thống, thiết kế CSDL, xây dựng API, tích hợp thanh toán/bên thứ 3, tối ưu SEO, đến native mobile debugging và CI/CD** — cho thấy năng lực đảm nhận vai trò dev độc lập trên toàn bộ vòng đời sản phẩm.
