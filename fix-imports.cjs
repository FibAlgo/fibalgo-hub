const fs = require("fs");

// Fix AdminDashboardClient
let admin = fs.readFileSync("src/app/admin/AdminDashboardClient.tsx", "utf8");
admin = admin.replace(
  "import { useState, useEffect, useRef } from 'react';",
  "import { useState, useEffect, useRef, useMemo, useCallback } from 'react';"
);
fs.writeFileSync("src/app/admin/AdminDashboardClient.tsx", admin);

// Fix DashboardClient  
let dash = fs.readFileSync("src/app/dashboard/DashboardClient.tsx", "utf8");
dash = dash.replace(
  "import { useEffect, useRef, useState } from 'react';",
  "import { useEffect, useRef, useState, useMemo, useCallback } from 'react';"
);
fs.writeFileSync("src/app/dashboard/DashboardClient.tsx", dash);

console.log("Imports fixed!");
