# FiveM Store API Documentation

## API Endpoints

### Authentication Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/auth/discord` | เริ่มต้น Discord OAuth login | No |
| GET | `/auth/discord/callback` | Callback URL สำหรับ Discord OAuth | No |
| GET | `/auth/logout` | Logout ผู้ใช้ | Yes |

### User Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/user` | ดึงข้อมูลผู้ใช้ปัจจุบัน | Yes |
| GET | `/api/user/points` | ดึงจำนวน points ของผู้ใช้ | Yes |
| POST | `/api/user/points/add` | เพิ่ม points ให้ผู้ใช้ | Yes |

### Scripts Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/scripts` | ดึงข้อมูล scripts ทั้งหมด | No |
| GET | `/api/scripts/:id` | ดึงข้อมูล script เฉพาะ ID | No |

### Cart Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/cart` | ดึงข้อมูลตะกร้าของผู้ใช้ | Yes |
| POST | `/api/cart/add` | เพิ่มสินค้าลงตะกร้า | Yes |
| POST | `/api/cart/remove` | ลบสินค้าออกจากตะกร้า | Yes |
| POST | `/api/cart/checkout` | ชำระเงินสินค้าในตะกร้า | Yes |

### Purchase Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/purchases` | ดึงประวัติการซื้อทั้งหมด | Yes |
| GET | `/api/purchases/:purchaseId` | ดึงข้อมูล purchase เฉพาะ | Yes |
| POST | `/api/purchases/:purchaseId/server-ip` | อัพเดท Server IP | Yes |

### License Routes
| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/api/verify-license` | ตรวจสอบ license | No |
| GET | `/api/license-status/:license` | ตรวจสอบสถานะ license | Yes |

### Admin Routes
| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| POST | `/api/admin/create` | สร้าง admin user | Yes |
| GET | `/api/admin/users` | ดึงข้อมูลผู้ใช้ทั้งหมด | Yes |
| PUT | `/api/admin/users/:userId` | อัพเดทข้อมูลผู้ใช้ | Yes |
| DELETE | `/api/admin/users/:userId/admin` | ลบสถานะ admin | Yes |

### Admin Script Management
| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| POST | `/api/admin/scripts` | เพิ่ม script ใหม่ | Yes |
| PUT | `/api/admin/scripts/:id` | อัพเดท script | Yes |
| DELETE | `/api/admin/scripts/:id` | ลบ script | Yes |
| DELETE | `/api/admin/scripts` | ลบ scripts ทั้งหมด | Yes |

### Admin Version Management
| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| POST | `/api/admin/scripts/:scriptId/versions` | เพิ่มเวอร์ชันใหม่ | Yes |
| PUT | `/api/admin/scripts/:scriptId/versions/:versionNumber` | อัพเดทเวอร์ชัน | Yes |
| DELETE | `/api/admin/scripts/:scriptId/versions/:versionNumber` | ลบ/ปิดการใช้งานเวอร์ชัน | Yes |
| GET | `/api/admin/scripts/:scriptId/versions` | ดึงข้อมูลเวอร์ชันทั้งหมด | Yes |

### Admin Purchase Management
| Method | Endpoint | Description | Admin Required |
|--------|----------|-------------|----------------|
| GET | `/api/admin/purchases` | ดึงข้อมูล purchases ทั้งหมด | Yes |
| PUT | `/api/admin/purchases/:id` | อัพเดทข้อมูล purchase | Yes |
| GET | `/api/admin/purchases/:id` | ดึงข้อมูล purchase เฉพาะ | Yes |

## Authentication

การ authentication ใช้ Discord OAuth2 โดยต้องส่ง token ในรูปแบบ session cookie

## Error Responses

Error responses จะมีรูปแบบดังนี้: 