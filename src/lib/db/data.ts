
// This file is no longer the source of truth, it's only used by the seeder script.
// Data is now managed by the SQLite database directly.
// Keeping this file for seeding purposes.

export const initialStaff = [
  { name: "Super Admin", email: "superadmin@lounge.com", role: "Super Admin" as const, status: "Active" as const, avatar: "https://placehold.co/100x100.png", floor: undefined, phone: "+237 600000000", hireDate: new Date("2022-01-15"), force_password_change: 0 },
  { name: "Manager User", email: "manager@lounge.com", role: "Manager" as const, status: "Active" as const, avatar: "https://placehold.co/100x100.png", floor: undefined, phone: "+237 600000001", hireDate: new Date("2022-03-10"), force_password_change: 0 },
  { name: "Accountant User", email: "accountant@lounge.com", role: "Accountant" as const, status: "Active" as const, avatar: "https://placehold.co/100x100.png", floor: undefined, phone: "+237 600000008", hireDate: new Date("2023-06-15"), force_password_change: 0 },
  { name: "Cashier User", email: "cashier@lounge.com", role: "Cashier" as const, status: "Active" as const, avatar: "https://placehold.co/100x100.png", floor: "Main Floor", phone: "+237 600000005", hireDate: new Date("2023-02-15"), force_password_change: 0 },
];
