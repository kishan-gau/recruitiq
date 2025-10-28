import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateKeys() {
  try {
    console.log('Generating RSA key pair...')

    // Generate 4096-bit RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    // Ensure keys directory exists
    const keysDir = path.join(__dirname)
    await fs.mkdir(keysDir, { recursive: true })

    // Write private key
    const privateKeyPath = path.join(keysDir, 'private.key')
    await fs.writeFile(privateKeyPath, privateKey, 'utf8')
    console.log(`✅ Private key saved to: ${privateKeyPath}`)

    // Write public key
    const publicKeyPath = path.join(keysDir, 'public.key')
    await fs.writeFile(publicKeyPath, publicKey, 'utf8')
    console.log(`✅ Public key saved to: ${publicKeyPath}`)

    // Create .gitignore in keys directory
    const gitignorePath = path.join(keysDir, '.gitignore')
    await fs.writeFile(gitignorePath, 'private.key\n', 'utf8')
    console.log(`✅ .gitignore created to protect private key`)

    console.log('\n✅ Key generation complete!')
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:')
    console.log('   1. Keep private.key SECRET - never commit to git')
    console.log('   2. Backup private.key securely')
    console.log('   3. Distribute public.key to RecruitIQ instances')
    console.log('   4. If private key is compromised, regenerate both keys')
    console.log('\n')

  } catch (error) {
    console.error('❌ Error generating keys:', error)
    process.exit(1)
  }
}

generateKeys()
