# **App Name**: LoungeOS

## Core Features:

- Secure User Authentication: User authentication and role-based access control (RBAC) with secure password handling, forced password changes on first login, and comprehensive login/logout activity logging.
- Staff Management: Comprehensive module for managing staff accounts, including creating, modifying, deactivating, activating, and deleting staff, with role assignment (Manager, Waitress, Stock Manager, Cashier, Chef) and specific floor assignments for waitresses.
- Inventory Management: Enhanced module for managing product inventory including categories, multi-step bulk stock-in/stock-out with auto-filling costs, custom date-range movement export (CSV/PDF), and full CSV template support for bulk item imports.
- Point of Sale (POS): Process sales transactions with multiple payment methods (Cash, Mobile Money, Orange Money, Bank Transfer), split payment functionality, discount application, and receipt printing.
- Kitchen Management Dashboard: Display a Trello-style interface for Chefs to manage order preparation, with new order notifications, drag-and-drop status updates, and waitress notifications for completed orders.
- Table Management System: Manage tables and floor layouts, including adding/editing/removing floors and tables, assigning tables to specific floors, visual layout with real-time status updates, and the ability to merge and split tables/orders.
- Accounting Module: Full accounting system with a customizable Chart of Accounts, manual journal entries, automatic transaction syncing from POS and Inventory, and research-backed financial reports (Profit & Loss, Balance Sheet, Cash Flow).
- Dashboard & Reporting: Admin dashboard with key performance indicators (KPIs), visual sales trends, top-selling products, current stock status, and comprehensive financial reporting module.
- Core Infrastructure: Designed for local network deployment, optimized for touch interactions across various screen sizes, high compatibility with major browsers, and full English/French language support (with French as default).
- Security: Robust role-based access control across all modules, sensitive data protection, encryption of critical data at rest, and logging of all significant actions for auditing.
- Performance: Highly optimized search functionality providing real-time results (under 1ms) as each character is typed, fast page loading, and efficient transaction processing.
- Offline Functionality: The entire application works 100% offline, storing data locally.
- Documentation & Support: Comprehensive user manual, detailed setup instructions for local server deployment, a troubleshooting guide/knowledge base, and readily available contact/support information.
- UI/UX Specifics: Predominantly black and white UI with small accents of red, blue, and green for emphasis; all buttons must have rounded corners and leverage Shadcn UI elements.
- Development Utilities: The application can start and function with mock data if the SQLite database is not connected or initialized.
- Session Management: Automatic session expiration after 2 hours of inactivity, prompting for re-authentication to stay logged in.
- Password Policies: Enforcement of strong password criteria (minimum length, character types) for new and reset passwords.
- Default Language: French is the default language, and the selected language preference is stored in the browser's local storage.
- Staff Interface Details: Real-time search/filter functionality for staff accounts, and a link/button to view individual staff login/logout activity.
- Staff Account Creation/Modification: Fields for Email and Phone (optional), auto-generation of initial passwords with a flag for forced change on first login; ability for Managers (Admin) to reset user passwords, forcing a password change at the next login.
- Super Admin Protection: The Super Admin account cannot be deleted.
- Logging of Actions: Comprehensive logging of all staff account management actions (creation, modification, password reset, activation/deactivation, deletion) and all significant application actions (sales transactions, inventory adjustments, etc.) for auditing.
- Product Listing Details: Visual highlighting for products with low stock, support for defining product variations (e.g., "Small," "Medium," "Large"), and an option to link food items to constituent ingredients.
- Category Management Details: Managers can select icons from a pre-defined set for categories, default categories (`Food`, `Whiskey`, `Wine`, `Beer`, `Soft_drinks`) are pre-populated, and the system handles products assigned to deleted categories (e.g., reassign or prompt for reassignment).
- Product Imaging: Products without a provided Image URL inherit a default placeholder image; all product images are displayed as squares and support a maximum size of 5MB.
- Inventory Import: A "Download CSV Template" button is provided with correct column headers to guide users; the system can automatically create categories if they don't exist during CSV import.
- Stock Adjustment: Manual adjustment of stock levels is a distinct action (e.g., for new deliveries, losses, returns).
- POS Interface Details: Products are displayed in a grid/list with images and category icons; users can adjust product quantities within an order; a field is available to add special notes or instructions to individual items or the entire order.
- Transaction Processing Details: A unique transaction ID is generated for each payment; logic prevents modification or deletion of transactions once processed and paid; functionality to apply discounts before payment processing is included; sold items are automatically deducted from inventory upon successful payment.
- Receipt Details: Receipts include the Platinium Lounge name/address, transaction date/time, item list (quantities, prices), total amount (in XAF), payment method, unique transaction ID, and the name of the waitress/waiter who placed the order; the layout is designed to print at approximately 1/3 the width of an A4 paper.
- Kitchen Notifications: A loud sound notification plays on the kitchen interface when a new order arrives; once an order is processed by the cashier, its card automatically disappears from the kitchen's "Complete" column.
- Table Management Configuration: Managers (Admin) can add, edit, and remove floors and tables, assigning tables to specific floors; waitresses can manually mark a table as "dirty" or "waiting for clean-up" after an order is completed.
- Report Filtering/Export: Reports can be filtered by custom date ranges, product categories, and individual staff performance; all reports can be exported to CSV and PDF.
- Individual Staff Performance Reports: Dedicated reports monitor individual waitress/waiter performance, including total sales generated, number of orders placed, and average order value, with filtering by date range.
- Troubleshooting Guide: A comprehensive guide with common issues and solutions, error code references, and contact information for support is provided.
- Setup Instructions: Clear and concise instructions for deploying the system on a local server environment (Linux, Docker) and detailed steps for SQLite setup are included.
- Accessibility: The application is designed for high accessibility, adhering to WCAG guidelines.
- Code Quality: The system will have well-structured and commented code, adhering to best practices, with a modular architecture for maintainability.
- Database Choice: SQLite (embedded).
- Local Database File: A local SQLite database file must be set up.
- Initial Schema Definition: The initial database schema must be defined for tables including `users` (staff accounts), `products`, `categories` (including icon storage), `orders`, `payments`, `login_logs`, `admin_activity_logs`, and `floors`.
- Secure Connection: A secure connection to the local SQLite database file must be established.
- Data Integrity: The system must maintain data integrity, ensuring all sales and inventory data are accurate and consistent.
- Data Encryption: All critical data at rest, including staff credentials and sensitive login information, must be encrypted using industry-standard encryption algorithms (e.g., AES-256).
- Automated Backups: A robust mechanism for data backup and recovery, including automated daily backups of the SQLite database file to a specified local network location.
- Recovery Procedure: A clear procedure for restoring data from backups in case of system failure or data loss.
- Indexing: Indexes should be created for database performance.
- Environment Variables: Specific environment variables (`SQLITE_DB_PATH`, `ENCRYPTION_KEY`, `BACKUP_DIR`) need to be configured for database operations and backups.
- Monitoring: Database performance monitoring will be implemented.

## Style Guidelines:

- Primary color: Dark blue (#2c3e50) to create a sophisticated and professional atmosphere.
- Background color: Off-white (#f0f0f0) to provide a clean and modern backdrop made of UI elements.
- Accent color: Soft red (#e74c3c) for emphasis on critical actions and status indicators.
- Headline font: 'Poppins', sans-serif, for a clean and modern aesthetic.
- Body font: 'PT Sans', sans-serif, providing good readability for longer text.
- Use a set of elegant, minimalistic icons from Lucide React for consistent visual cues.
- Employ a responsive design with rounded buttons for a modern, touch-friendly interface, optimized for various screen sizes from small phone/tablet screens to large computer screens.
