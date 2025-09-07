@@ .. @@
 import { NextResponse } from 'next/server';
+import { testConnection, createTradesTable } from '@/lib/db';
 
 export async function GET() {
+  try {
+    // Test database connection
+    const dbConnected = await testConnection();
+    
+    // Create trades table if it doesn't exist
+    if (dbConnected) {
+      await createTradesTable();
+    }
+    
+    return NextResponse.json({
+      status: 'OK',
+      timestamp: new Date().toISOString(),
+      version: '1.0.0',
+      service: 'Trading Manager API',
+      timezone: 'Europe/Madrid',
+      database: dbConnected ? 'Connected' : 'Disconnected'
+    });
+  } catch (error) {
+    console.error('Health check error:', error);
+    return NextResponse.json({
+      status: 'ERROR',
+      timestamp: new Date().toISOString(),
+      error: 'Service unavailable',
+      database: 'Error'
+    }, { status: 503 });
+  }
+}