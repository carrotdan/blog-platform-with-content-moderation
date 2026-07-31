# Getting Started — Hướng dẫn chạy app từ đầu đến cuối

Tài liệu này hướng dẫn bạn cài đặt và chạy toàn bộ hệ thống từ zero trên máy local, bao gồm:

- **Backend** — Node.js / Express (cổng 5000)
- **Frontend** — Next.js (cổng 3000)
- **AI Service** — Python FastAPI + XLM-RoBERTa (cổng 8000)
- **Database** — MongoDB

Không cần kinh nghiệm DevOps. Đọc từng bước, làm theo thứ tự.

---

## Mục lục

1. [Kiểm tra & cài đặt phần mềm cần thiết](#1-kiểm-tra--cài-đặt-phần-mềm-cần-thiết)
2. [Lấy source code](#2-lấy-source-code)
3. [Cài đặt MongoDB](#3-cài-đặt-mongodb)
4. [Tải model AI (XLM-RoBERTa)](#4-tải-model-ai-xlm-roberta)
5. [Cài đặt Python environment cho AI Service](#5-cài-đặt-python-environment-cho-ai-service)
6. [Cài đặt Node.js dependencies](#6-cài-đặt-nodejs-dependencies)
7. [Tạo file .env](#7-tạo-file-env)
8. [Tạo tài khoản Cloudinary (tuỳ chọn)](#8-tạo-tài-khoản-cloudinary-tuỳ-chọn)
9. [Chạy hệ thống](#9-chạy-hệ-thống)
10. [Kiểm tra hệ thống đang chạy đúng](#10-kiểm-tra-hệ-thống-đang-chạy-đúng)
11. [Tạo tài khoản đầu tiên & cấp quyền ADMIN](#11-tạo-tài-khoản-đầu-tiên--cấp-quyền-admin)
12. [Sử dụng tính năng chính](#12-sử-dụng-tính-năng-chính)
13. [Dừng hệ thống](#13-dừng-hệ-thống)
14. [Xử lý lỗi thường gặp](#14-xử-lý-lỗi-thường-gặp)

---

## 1. Kiểm tra & cài đặt phần mềm cần thiết

Bạn cần có đủ 4 phần mềm sau trước khi bắt đầu.

### 1.1 Node.js (v18 trở lên)

Kiểm tra xem đã có chưa:
```bash
node -v
npm -v
```

Nếu chưa có, tải tại: https://nodejs.org → chọn bản **LTS**.

> **Windows:** Dùng installer `.msi`. Chọn ô "Add to PATH" khi cài.
> **macOS:** `brew install node` (nếu có Homebrew).
> **Linux (Ubuntu/Debian):**
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
> sudo apt-get install -y nodejs
> ```

Sau khi cài xong, chạy lại `node -v` — phải thấy `v18.x.x` hoặc cao hơn.

---

### 1.2 Python (v3.9 trở lên, khuyên dùng 3.10 hoặc 3.11)

Kiểm tra:
```bash
python --version
# hoặc
python3 --version
```

Nếu chưa có: https://python.org/downloads → chọn bản 3.10 hoặc 3.11.

> **Windows:** Tick ô **"Add Python to PATH"** khi cài — rất quan trọng.
> **macOS:** `brew install python@3.11`
> **Linux:** `sudo apt-get install python3 python3-pip python3-venv`

---

### 1.3 MongoDB (Community Edition)

Bạn có 2 lựa chọn:

**Lựa chọn A — MongoDB Atlas (đám mây, không cần cài cục bộ, khuyên dùng):**
- Tạo tài khoản miễn phí tại https://cloud.mongodb.com
- Tạo cluster Free Tier (M0)
- Ghi lại connection string dạng: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/blog-platform`
- Dùng connection string này cho biến `MONGO_URI` ở bước 7

**Lựa chọn B — MongoDB cục bộ:**
- Windows: https://www.mongodb.com/try/download/community → installer `.msi`
- macOS: `brew tap mongodb/brew && brew install mongodb-community`
- Linux: https://www.mongodb.com/docs/manual/administration/install-on-linux/

Sau khi cài, khởi động MongoDB service:
```bash
# macOS / Linux
sudo systemctl start mongod
# hoặc
brew services start mongodb-community

# Windows (trong PowerShell as admin)
net start MongoDB
```

Kiểm tra MongoDB đang chạy:
```bash
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```
Nếu thấy `ok: 1` là được.

Connection string khi dùng local: `mongodb://localhost:27017/blog-platform`

---

### 1.4 Git

Kiểm tra:
```bash
git --version
```

Nếu chưa có: https://git-scm.com/downloads

---

## 2. Lấy source code

```bash
# Clone repo về máy
git clone <URL_REPO_CỦA_BẠN>

# Vào thư mục project
cd blog-platform-with-content-moderation
```

> Nếu bạn đã có source code sẵn dưới dạng ZIP, giải nén ra rồi `cd` vào thư mục đó.

Cấu trúc thư mục bạn sẽ thấy:

```
blog-platform-with-content-moderation/
├── ai_service/        ← Python FastAPI service
├── controllers/       ← Express controllers
├── docs/              ← Tài liệu (bạn đang đọc file này)
├── frontend/          ← Next.js app
├── middlewares/
├── models/            ← Mongoose schemas
├── notebook/          ← Jupyter notebooks (AI training, không cần chạy)
├── repositories/
├── routes/
├── services/
├── uploads/           ← File upload local (tự tạo nếu chưa có)
├── app.js             ← Entry point Node.js backend
├── package.json       ← Dependencies backend
└── .env               ← Bạn sẽ tạo file này ở bước 7
```

---

## 3. Cài đặt MongoDB

Đã xử lý ở bước 1.3. Đảm bảo MongoDB đang **chạy** trước khi sang bước tiếp theo.

---

## 4. Tải model AI (XLM-RoBERTa)

Model AI **không nằm trong repo** (quá lớn, ~1.1 GB). Bạn cần đặt nó vào đúng chỗ trước khi chạy AI service.

### Thư mục model cần có

Tạo thư mục `final_model/` ngay trong thư mục gốc của project:

```bash
mkdir final_model
```

Thư mục này phải chứa đủ 4 file sau:

```
final_model/
├── config.json
├── model.safetensors    ← ~1.1 GB, file lớn nhất
├── tokenizer.json
└── tokenizer_config.json
```

### Cách lấy model

**Nếu bạn đã train model (chạy notebook `xlm-roberta-.ipynb` trên Kaggle):**
- Download output zip từ Kaggle
- Giải nén vào `final_model/`

**Nếu nhóm/team đã cung cấp sẵn model:**
- Copy 4 file trên vào `final_model/`

**Nếu muốn test nhanh mà chưa có model:**
- Bỏ qua bước này
- AI service sẽ không chạy được, nhưng backend vẫn hoạt động với chế độ fallback (mọi nội dung đều được coi là NORMAL, không bị kiểm duyệt tự động)
- Xem thêm: [14. Xử lý lỗi thường gặp](#14-xử-lý-lỗi-thường-gặp)

---

## 5. Cài đặt Python environment cho AI Service

**Khuyên dùng virtual environment** để tránh xung đột với các Python project khác trên máy.

### 5.1 Tạo virtual environment

```bash
# Đứng ở thư mục gốc của project
python -m venv venv
```

> Nếu lệnh trên báo lỗi, thử `python3 -m venv venv`

### 5.2 Kích hoạt virtual environment

```bash
# macOS / Linux
source venv/bin/activate

# Windows (Command Prompt)
venv\Scripts\activate.bat

# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

Sau khi kích hoạt, terminal sẽ hiển thị `(venv)` ở đầu dòng — đó là dấu hiệu thành công.

### 5.3 Cài đặt Python packages

```bash
pip install fastapi uvicorn torch transformers pydantic
```

Lệnh trên sẽ tải và cài đặt tất cả thư viện cần thiết. Quá trình này mất **5–15 phút** tuỳ tốc độ mạng vì `torch` khá lớn (~2 GB).

> **Nếu máy có GPU NVIDIA và muốn chạy nhanh hơn:**
> Cài PyTorch phiên bản CUDA thay vì CPU-only. Xem hướng dẫn tại: https://pytorch.org/get-started/locally/
> Chọn đúng phiên bản CUDA driver đang có trên máy.

> **Nếu máy không có GPU:** Không sao, model vẫn chạy trên CPU — chỉ chậm hơn (1–3 giây/request thay vì <0.2 giây).

### 5.4 Kiểm tra Python cài thành công

```bash
python -c "import fastapi, torch, transformers; print('OK')"
```

Phải in ra `OK`. Nếu báo `ModuleNotFoundError`, chạy lại lệnh pip ở bước 5.3.

---

## 6. Cài đặt Node.js dependencies

### 6.1 Backend dependencies

```bash
# Đứng ở thư mục gốc của project
npm install
```

Sẽ tải xuống tất cả packages trong `package.json`. Mất ~1–2 phút.

### 6.2 Frontend dependencies

```bash
cd frontend
npm install
cd ..
```

Mất ~2–5 phút (Next.js có nhiều dependencies hơn).

---

## 7. Tạo file .env

File `.env` chứa tất cả cấu hình bí mật của hệ thống. **File này KHÔNG được commit lên git.**

Tạo file `.env` ở **thư mục gốc** của project (cùng cấp với `app.js`):

```bash
# macOS / Linux
touch .env

# Windows
echo. > .env
```

Mở file và dán vào nội dung sau, sau đó **thay thế các giá trị `THAY_GIA_TRI_O_DAY`**:

```env
# ── Backend Server ─────────────────────────────────────────────
PORT=5000

# ── MongoDB ────────────────────────────────────────────────────
# Nếu dùng MongoDB Atlas:
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/blog-platform
# Nếu dùng MongoDB local:
# MONGO_URI=mongodb://localhost:27017/blog-platform

# ── JWT (BẮT BUỘC phải điền, dùng chuỗi bí mật tuỳ ý) ─────────
JWT_ACCESS_SECRET=THAY_GIA_TRI_O_DAY_vi_du_abc123xyz_very_long_random_string
JWT_REFRESH_SECRET=THAY_GIA_TRI_O_DAY_vi_du_def456uvw_another_long_random_string
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# ── AI Service ─────────────────────────────────────────────────
AI_SERVICE_URL=http://localhost:8000
AI_TIMEOUT_MS=10000

# ── Frontend URL (cho CORS) ────────────────────────────────────
CLIENT_URL=http://localhost:3000

# ── Cloudinary (tuỳ chọn — xem bước 8) ────────────────────────
# Nếu KHÔNG có Cloudinary, xoá hoặc comment 3 dòng dưới.
# Media vẫn upload được vào thư mục local /uploads
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
```

### Quan trọng về JWT secrets

`JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` là **mật khẩu bảo vệ token đăng nhập**. Dùng 2 chuỗi **khác nhau**, càng dài và ngẫu nhiên càng tốt. Ví dụ tạo chuỗi ngẫu nhiên bằng terminal:

```bash
# macOS / Linux — chạy 2 lần, lấy 2 giá trị khác nhau
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 8. Tạo tài khoản Cloudinary (tuỳ chọn)

Cloudinary là dịch vụ lưu trữ ảnh/video trên cloud. Nếu không cấu hình, ảnh sẽ được lưu vào thư mục `uploads/` trên máy local — **chức năng vẫn hoạt động bình thường**, chỉ là ảnh sẽ mất nếu xoá thư mục đó.

**Nếu bạn muốn dùng Cloudinary:**

1. Đăng ký miễn phí tại https://cloudinary.com (free tier đủ dùng để test)
2. Sau khi đăng nhập, vào **Dashboard**
3. Ghi lại 3 thông tin: **Cloud name**, **API Key**, **API Secret**
4. Bỏ comment và điền vào file `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
   ```

---

## 9. Chạy hệ thống

Bạn cần mở **3 terminal riêng biệt**, mỗi terminal chạy 1 service. Để 3 terminal này mở song song trong suốt quá trình sử dụng.

---

### Terminal 1 — AI Service (Python)

```bash
# 1. Đứng ở thư mục gốc của project
# 2. Kích hoạt virtual environment
source venv/bin/activate       # macOS / Linux
# venv\Scripts\activate.bat   # Windows CMD

# 3. Chạy AI service
python ai_service/main.py
```

**Output bình thường sẽ trông như thế này:**
```
INFO:     Loading model from: /path/to/project/final_model
INFO:     Using device: cpu
INFO:     Model loaded successfully!
INFO:     num_labels: 2
INFO:     Label mapping: LABEL_0=TOXIC, LABEL_1=SPAM
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> ⚠️ **Bước load model mất 20–60 giây** lần đầu tiên (phải đọc file ~1.1 GB vào RAM). Đợi đến khi thấy dòng `Uvicorn running on http://0.0.0.0:8000` mới sang terminal tiếp theo.

> Nếu chưa có `final_model/`, bạn sẽ thấy lỗi `RuntimeError: Model directory not found`. Xem [bước 4](#4-tải-model-ai-xlm-roberta) hoặc [phần xử lý lỗi](#14-xử-lý-lỗi-thường-gặp).

---

### Terminal 2 — Backend (Node.js)

```bash
# Đứng ở thư mục gốc của project
npm run dev
```

**Output bình thường:**
```
[nodemon] starting `node app.js`
Connected to MongoDB
Server running on port 5000
```

> Nếu thấy `Failed to connect to MongoDB` — kiểm tra lại `MONGO_URI` trong `.env` và đảm bảo MongoDB đang chạy.

> Nodemon sẽ tự động restart backend khi bạn sửa code. Bình thường.

---

### Terminal 3 — Frontend (Next.js)

```bash
# Vào thư mục frontend
cd frontend

# Chạy frontend
npm run dev
```

**Output bình thường:**
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
- Ready in 2.5s
```

---

## 10. Kiểm tra hệ thống đang chạy đúng

Sau khi cả 3 terminal đã chạy, thực hiện các kiểm tra sau:

### Kiểm tra AI Service

Mở trình duyệt, vào: http://localhost:8000/health

Phải thấy JSON tương tự:
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu",
  "labels": { "LABEL_0": "TOXIC", "LABEL_1": "SPAM" },
  "thresholds": { "spam": 0.5, "toxic": 0.5 }
}
```

Quan trọng: `"model_loaded": true`. Nếu thấy `false`, đợi thêm vài giây và refresh.

Bạn cũng có thể xem Swagger UI (tài liệu API tự động) tại: http://localhost:8000/docs

### Kiểm tra Backend

Mở trình duyệt, vào: http://localhost:5000/api/posts

Phải thấy JSON:
```json
{ "success": true, "message": "Posts retrieved", "data": [] }
```

(Mảng `data` rỗng là bình thường nếu chưa có post nào.)

### Kiểm tra Frontend

Mở trình duyệt, vào: http://localhost:3000

Phải thấy trang chủ của blog platform.

---

## 11. Tạo tài khoản đầu tiên & cấp quyền ADMIN

### 11.1 Đăng ký tài khoản

1. Vào http://localhost:3000/register
2. Điền `email`, `username`, `password`
3. Nhấn đăng ký

### 11.2 Đăng nhập

1. Vào http://localhost:3000/login
2. Đăng nhập với thông tin vừa tạo

### 11.3 Cấp quyền ADMIN cho tài khoản đầu tiên

Mặc định mọi tài khoản mới đều có role `USER`. Để cấp quyền `ADMIN`, bạn cần vào thẳng MongoDB:

**Cách 1 — Dùng MongoDB Compass (GUI, dễ nhất):**

1. Tải MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Connect với connection string của bạn
3. Vào database `blog-platform` → collection `users`
4. Tìm document của tài khoản vừa tạo
5. Sửa field `role` từ `"USER"` thành `"ADMIN"`
6. Lưu lại

**Cách 2 — Dùng mongosh (command line):**

```bash
# Kết nối vào MongoDB
mongosh "mongodb://localhost:27017/blog-platform"
# Hoặc Atlas:
# mongosh "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/blog-platform"

# Thay your@email.com bằng email tài khoản vừa đăng ký
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "ADMIN" } }
)

# Kiểm tra
db.users.findOne({ email: "your@email.com" }, { role: 1, username: 1 })
```

Phải thấy `"role": "ADMIN"`.

### 11.4 Đăng xuất và đăng nhập lại

Sau khi đổi role trong DB, **bắt buộc phải đăng xuất và đăng nhập lại** trên frontend. Token cũ vẫn mang role `USER`, chỉ token mới (sau khi login lại) mới có role `ADMIN`.

### 11.5 Truy cập trang Admin

Sau khi login lại với role ADMIN, vào: http://localhost:3000/admin

Bạn sẽ thấy dashboard quản trị gồm:
- **Moderation Queue** — nội dung bị AI flag chờ duyệt
- **Reports** — báo cáo từ người dùng
- **Users** — quản lý tài khoản (mute, ban, đổi role, reset điểm vi phạm)
- **Posts** — xem và quản lý tất cả bài viết
- **Violations** — bảng xếp hạng người dùng vi phạm

---

## 12. Sử dụng tính năng chính

### Đăng bài viết

1. Đăng nhập vào tài khoản
2. Nhấn nút tạo bài viết (thường ở navbar hoặc trang chủ)
3. Điền tiêu đề, nội dung, tag
4. Upload ảnh/video nếu muốn (tối đa 10 file, mỗi file tối đa 100 MB)
5. Nhấn **Publish**

**Điều gì xảy ra khi bạn đăng bài?**
- Backend gọi AI service để phân tích nội dung
- Nếu nội dung bình thường (NORMAL) → bài được đăng ngay, hiển thị trên feed
- Nếu AI phát hiện SPAM hoặc TOXIC → bài bị ẩn, bạn nhận thông báo, và bài vào queue chờ admin duyệt

### Bình luận

1. Vào một bài viết
2. Gõ bình luận và nhấn submit
3. AI cũng phân tích bình luận theo cơ chế tương tự như bài viết

### Kháng cáo nội dung bị ẩn

1. Vào http://localhost:3000/appeals
2. Nhấn "Kháng cáo" trên nội dung bị flag
3. Điền lý do (tối đa 500 ký tự)
4. Chờ admin xem xét — bạn sẽ nhận thông báo real-time khi có kết quả

### Nhắn tin trực tiếp

1. Vào trang profile của người dùng khác
2. Nhấn nút nhắn tin
3. Hội thoại được tạo tự động, tin nhắn real-time qua WebSocket

### Thông báo real-time

Chuông thông báo ở navbar cập nhật tự động. Các loại thông báo:
- Ai đó like, bình luận, repost, follow bài/tài khoản của bạn
- AI flag nội dung của bạn (kèm preview nội dung bị flag)
- Kết quả kháng cáo được admin xử lý

---

## 13. Dừng hệ thống

Để dừng từng service, vào terminal tương ứng và nhấn `Ctrl + C`.

Thứ tự dừng đề xuất (không bắt buộc):
1. Frontend (Terminal 3)
2. Backend (Terminal 2)
3. AI Service (Terminal 1)

---

## 14. Xử lý lỗi thường gặp

---

### ❌ AI Service: `RuntimeError: Model directory not found`

**Nguyên nhân:** Thư mục `final_model/` không tồn tại hoặc thiếu file.

**Cách xử lý:**
1. Kiểm tra thư mục `final_model/` có đúng vị trí không (phải nằm trong thư mục gốc, cùng cấp `app.js`)
2. Kiểm tra đủ 4 file: `config.json`, `model.safetensors`, `tokenizer.json`, `tokenizer_config.json`

**Nếu chưa có model và chỉ muốn test:**
- Không chạy AI service
- Backend sẽ tự fallback về NORMAL cho mọi nội dung — không bị lỗi
- Tất cả tính năng khác vẫn hoạt động bình thường

---

### ❌ Backend: `Failed to connect to MongoDB`

**Nguyên nhân:** MongoDB không chạy, hoặc `MONGO_URI` sai.

**Cách xử lý:**
1. Kiểm tra MongoDB đang chạy:
   ```bash
   # Linux / macOS
   sudo systemctl status mongod
   # hoặc
   brew services list | grep mongodb

   # Windows
   sc query MongoDB
   ```
2. Nếu chưa chạy, khởi động lại (xem bước 1.3)
3. Kiểm tra `MONGO_URI` trong `.env` — đặc biệt username/password nếu dùng Atlas

---

### ❌ Backend: `Error: JWT_ACCESS_SECRET is not set` hoặc token không hợp lệ

**Nguyên nhân:** Chưa tạo file `.env` hoặc để trống `JWT_ACCESS_SECRET`.

**Cách xử lý:** Kiểm tra file `.env` đã có ở thư mục gốc và 2 biến JWT đã được điền.

---

### ❌ Frontend: `Network Error` hoặc `Failed to fetch`

**Nguyên nhân:** Frontend không kết nối được tới backend.

**Cách xử lý:**
1. Đảm bảo backend đang chạy ở cổng 5000
2. Kiểm tra `CLIENT_URL=http://localhost:3000` trong `.env`
3. Nếu bạn đổi cổng backend, cần cập nhật URL trong code frontend

---

### ❌ `EADDRINUSE: address already in use :::5000`

**Nguyên nhân:** Cổng 5000 đã bị process khác dùng (thường là backend chạy từ lần trước chưa tắt hẳn).

**Cách xử lý:**
```bash
# macOS / Linux — tìm process dùng cổng 5000
lsof -ti:5000 | xargs kill -9

# Windows — tìm và kill process
netstat -ano | findstr :5000
taskkill /PID <số_PID_tìm_được> /F
```

Tương tự cho cổng 3000 và 8000 nếu gặp lỗi tương tự.

---

### ❌ `npm install` báo lỗi permission

**Nguyên nhân:** Thiếu quyền ghi vào thư mục `node_modules`.

**Cách xử lý (không dùng sudo với npm):**
```bash
# Xoá node_modules và cache rồi cài lại
rm -rf node_modules
npm cache clean --force
npm install
```

---

### ❌ AI Service chạy được nhưng model load lâu hơn 5 phút

**Nguyên nhân:** Máy RAM ít (<8 GB) hoặc đĩa cứng HDD chậm.

**Cách xử lý:** Đợi thêm. Model ~1.1 GB cần ~30–90 giây để load lần đầu trên máy bình thường. Nếu sau 3 phút vẫn chưa thấy dòng `Uvicorn running on...`, kiểm tra lại RAM available.

---

### ❌ Upload ảnh báo lỗi nhưng nội dung vẫn đăng được

**Nguyên nhân:** Cloudinary chưa được cấu hình — hệ thống fallback sang lưu local.

**Hành vi bình thường:** Ảnh vẫn được lưu vào thư mục `uploads/` và hiển thị qua URL `http://localhost:5000/uploads/...`. Đây là fallback có chủ ý, không phải lỗi nghiêm trọng.

---

### ❌ Trang /admin hiển thị "Forbidden" hoặc không load được

**Nguyên nhân:** Role tài khoản chưa phải `ADMIN`.

**Cách xử lý:** Thực hiện lại bước 11.3, sau đó **đăng xuất và đăng nhập lại** (bắt buộc để cấp token mới mang role ADMIN).

---

### ❌ Thông báo real-time không hiện

**Nguyên nhân:** WebSocket chưa được join room.

**Cách xử lý:**
1. Đăng xuất rồi đăng nhập lại
2. Kiểm tra console trình duyệt (F12) xem có lỗi WebSocket không
3. Đảm bảo backend đang chạy và cổng 5000 accessible

---

## Tóm tắt nhanh — Checklist trước khi chạy

Mỗi khi muốn chạy app, đi qua checklist này:

- [ ] MongoDB đang chạy
- [ ] File `.env` tồn tại và có đủ giá trị (đặc biệt `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- [ ] Thư mục `final_model/` có đủ 4 file (nếu muốn AI hoạt động)
- [ ] Terminal 1: virtual env đã activate, `python ai_service/main.py` đang chạy
- [ ] Terminal 2: `npm run dev` (backend) đang chạy ở cổng 5000
- [ ] Terminal 3: `cd frontend && npm run dev` đang chạy ở cổng 3000
- [ ] Kiểm tra http://localhost:8000/health → `model_loaded: true`
- [ ] Kiểm tra http://localhost:5000/api/posts → `success: true`
- [ ] Kiểm tra http://localhost:3000 → trang chủ hiển thị
