import bcrypt from 'bcryptjs'

const password = 'admin123'
const salt = await bcrypt.genSalt(10)
const hash = await bcrypt.hash(password, salt)

console.log('Password hash for "admin123":')
console.log(hash)
console.log('\nUse this in init.sql')
