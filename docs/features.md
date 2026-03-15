# Application Features

This document provides a high-level overview of the key features in LoungeOS.

## Core Modules

### 1. Point of Sale (POS)

- **Location**: `/dashboard/pos`
- **Description**: The central hub for taking customer orders. Staff can select a table, add items from a categorized grid, and send the order to the kitchen or bar.
- **Key Actions**:
  - Place new orders.
  - Charge customers and process payments (Cash, Card, Mobile).
  - Generate receipts upon payment.

### 2. Kitchen & Bar Displays

- **Location**: `/dashboard/kitchen` and `/dashboard/bar`
- **Description**: Kanban-style boards that display active orders for the kitchen (food) and bar (drinks) staff.
- **Key Actions**:
  - View incoming orders in real-time.
  - Update order status from "Pending" -> "In Progress" -> "Ready".
  - Orders are automatically cleared once paid for at the POS.

### 3. Inventory & Meal Management

- **Location**: `/dashboard/inventory` and `/dashboard/meals`
- **Description**:
  - **Inventory**: Enhanced module for raw materials and stock items. Features include multi-step bulk stock-in/stock-out with auto-filling costs, custom date-range movement export (CSV/PDF), and bulk item import via CSV.
  - **Meals**: Create and manage sellable dishes. Set their price, category, and available quantity.
- **Key Actions**:
  - Add, edit, and delete inventory items and meals.
  - Track stock levels with "In Stock", "Low Stock", and "Out of Stock" statuses.
  - Export stock movements to CSV/PDF with professional headers.
  - Import inventory items in bulk from CSV files.

### 4. Floor & Table Management

- **Location**: `/dashboard/floors` and `/dashboard/tables`
- **Description**: Visually manage the restaurant's layout.
- **Key Actions**:
  - Create and manage service areas (Floors).
  - Create and manage tables, including capacity and status (Available, Occupied, Reserved).
  - **Bulk Actions**: Move multiple tables to a different floor, update statuses in bulk, or perform bulk deletions.

### 5. Staff Management

- **Location**: `/dashboard/staff`
- **Description**: Manage all employee accounts and roles.
- **Key Actions**:
  - Add, edit, and delete staff members.
  - Assign roles to control access to different parts of the application.

### 6. Accounting & Financial Management

- **Location**: `/dashboard/accounting`
- **Description**: Full accounting system integrated with POS and Inventory.
- **Key Actions**:
  - **Dashboard**: Track Net Profit, Revenue, Expenses, and Profit Margins.
  - **Sync System**: Automatically generate journal entries from POS sales and inventory movements.
  - **Chart of Accounts**: Manage the business's account hierarchy (Assets, Liabilities, Equity, Revenue, Expenses).
  - **Financial Reports**: Generate research-backed Profit & Loss, Balance Sheet, and Cash Flow statements.
  - **PDF Documents**: Professional PDF generation with organization branding (logo, address, header/footer).

### 7. Reporting & Analytics

- **Location**: `/dashboard/reports`
- **Description**: Provides insights into sales performance.
- **Key Actions**:
  - View total revenue, order counts, and average sale value.
  - Analyze sales over time and by product category.
  - Filter reports by date range.

### 8. Support & Knowledge Base

- **Location**: `/dashboard/support` and `/dashboard/knowledge-base`
- **Description**:
  - **Support**: An internal ticketing system for staff to report issues (e.g., IT problems, maintenance requests).
  - **Knowledge Base**: A searchable, bilingual library of articles explaining how to use the system.

## Image Uploads Implementation

The application is designed to handle image uploads for staff avatars and meal pictures by storing file paths, not the files themselves, in the database.

### Expected Backend Behavior

A simple API endpoint (e.g., using a Next.js API Route) needs to be created to handle this. It should:

1.  Accept a file upload (e.g., `multipart/form-data`).
2.  Create the `public/uploads/` directory if it doesn't exist, along with subdirectories like `staff` and `meals`.
3.  Process the image (e.g., cropping, resizing).
4.  Save the final image to the appropriate subdirectory (e.g., `public/uploads/meals/beef-burger.png`).
5.  Return the public path of the saved image (e.g., `/uploads/meals/beef-burger.png`).

This returned path is what should be saved in the `avatar` or `image` column in the database. The UI in the Settings and Meals pages already contains placeholders for this functionality.
