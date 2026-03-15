# Authentication and User Roles

This document outlines the authentication system, user roles, and permissions within LoungeOS.

## Default User Accounts

After running the database seed script (`npm run db:seed`), the following user accounts will be created. The password for all accounts is `password`.

| Email | Role | Assigned Floor | Description |
| :--- | :--- | :--- | :--- |
| `superadmin@lounge.com` | Super Admin | N/A | Full access to all features and settings. |
| `manager@lounge.com` | Manager | N/A | Manages daily operations, staff, and inventory. |
| `accountant@lounge.com` | Accountant | N/A | Manages financial records and accounting. |
| `stock@lounge.com` | Stock Manager | N/A | Manages inventory and suppliers. |
| `chef@lounge.com` | Chef | N/A | Access to the Kitchen Display to manage orders. |
| `waiter-main@lounge.com` | Waiter | Main Floor | Takes orders and manages tables on the Main Floor. |
| `waiter-vip@lounge.com` | Waiter | VIP Lounge | Takes orders and manages tables in the VIP Lounge. |
| `cashier@lounge.com` | Cashier | N/A | Processes payments via the POS interface. |
| `bartender@lounge.com` | Bartender | N/A | Access to the Bar Display to manage drink orders. |

## Role-Based Access Control (RBAC)

The application uses a role-based system to control access to different pages and features. Permissions are checked on each page and for specific actions.

### Permission Breakdown

-   **Super Admin**: Can do everything. This role is for system setup and has unrestricted access.
-   **Manager**: Can access most features, including:
    -   Dashboard & Reports
    -   Accounting Module
    -   POS, Kitchen, and Bar views
    -   Management of Floors, Tables, Staff, Meals, Categories, and Suppliers.
-   **Accountant**: Focused on financial management.
    -   Accounting Module (full access)
    -   Can view Dashboard, Reports, Orders, Meals, and Inventory.
-   **Stock Manager**: A specialized role focused on inventory.
    -   Inventory & Suppliers management.
    -   Can view Meals.
-   **Chef**: Focused on the kitchen workflow.
    -   Kitchen Display view.
    -   Can manage Meals.
-   **Waiter**: Focused on customer service.
    -   POS view (limited to their assigned floor).
    -   Table management view.
-   **Cashier**: Focused on payments.
    -   POS view for processing payments.
    -   Bar display view.
-   **Bartender**: Focused on drink preparation.
    -   Bar display view.

## Password Management

-   **Initial Password**: All seeded users have the default password `password`.
-   **Password Change**: The system is designed to force users to change their password on first login. The `force_password_change` flag in the `users` table controls this (this logic must be implemented in the application).
-   **Password Hashing**: The seeding script uses `bcryptjs` to hash passwords before storing them in the database, which is a security best practice.
