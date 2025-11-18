# Refactor productPermissionRepository.js
$file = "src\products\nexus\repositories\productPermissionRepository.js"
$content = Get-Content $file -Raw

# Replace pool.query with this.query
$content = $content -replace 'await pool\.query\(query,', 'await this.query(sql,'
$content = $content -replace 'const query = `', 'const sql = `'
$content = $content -replace ', organizationId\);$', ', organizationId);'

# Add error handling to each method (wrap existing code)
# This is complex, so we'll do it manually via multi-replace

Set-Content $file $content
Write-Host "Refactored productPermissionRepository.js"

# Refactor productFeatureRepository.js  
$file2 = "src\products\nexus\repositories\productFeatureRepository.js"
$content2 = Get-Content $file2 -Raw

# Replace pool.query with this.query
$content2 = $content2 -replace 'await pool\.query\(query,', 'await this.query(sql,'
$content2 = $content2 -replace 'const query = `', 'const sql = `'

# Update imports
$content2 = $content2 -replace "import pool from '../../../config/database.js';", "import { query } from '../../../config/database.js';"
$content2 = $content2 -replace "import ProductFeature from '../models/ProductFeature.js';", "import { query } from '../../../config/database.js';`nimport logger from '../../../utils/logger.js';`nimport ProductFeature from '../models/ProductFeature.js';"

# Fix double import
$content2 = $content2 -replace "import \{ query \} from '../../../config/database.js';`r?`nimport \{ query \} from '../../../config/database.js';", "import { query } from '../../../config/database.js';"

# Add constructor
$content2 = $content2 -replace '(class ProductFeatureRepository \{)', "`$1`n  constructor(database = null) {`n    this.query = database?.query || query;`n    this.logger = logger;`n  }`n"

# Update export
$content2 = $content2 -replace 'export default new ProductFeatureRepository\(\);', 'export default ProductFeatureRepository;'

Set-Content $file2 $content2
Write-Host "Refactored productFeatureRepository.js"
