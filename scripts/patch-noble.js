/**
 * Patch @noble/* package exports for Vite compatibility
 * 
 * @noble/curves v2.0.1 and @noble/hashes v2.0.1 use strict ESM exports
 * with .js extensions. Some dependencies (nostr-tools) import without
 * the .js extension, causing build failures.
 * 
 * This script adds extensionless exports to fix the issue.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nodeModules = join(__dirname, '..', 'node_modules');

function patchPackageAtPath(pkgPath, additionalExports) {
	if (!existsSync(pkgPath)) {
		return false;
	}
	
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
		
		if (!pkg.exports) {
			pkg.exports = {};
		}
		
		let patched = 0;
		for (const [key, value] of Object.entries(additionalExports)) {
			if (!pkg.exports[key]) {
				pkg.exports[key] = value;
				patched++;
			}
		}
		
		if (patched > 0) {
			writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
			return patched;
		}
		return 0;
	} catch (err) {
		console.error(`❌ Failed to patch ${pkgPath}:`, err.message);
		return -1;
	}
}

function findAllPackagePaths(nodeModulesPath, pkgName, visited = new Set()) {
	const paths = [];
	
	// Prevent infinite loops
	const realPath = nodeModulesPath;
	if (visited.has(realPath)) return paths;
	visited.add(realPath);
	
	// Direct path
	const directPath = join(nodeModulesPath, pkgName, 'package.json');
	if (existsSync(directPath)) {
		paths.push(directPath);
	}
	
	// Check nested node_modules in each package
	try {
		const entries = readdirSync(nodeModulesPath);
		for (const entry of entries) {
			if (entry.startsWith('.')) continue;
			
			const entryPath = join(nodeModulesPath, entry);
			try {
				if (!statSync(entryPath).isDirectory()) continue;
			} catch {
				continue;
			}
			
			// Handle scoped packages
			if (entry.startsWith('@')) {
				try {
					const scopedEntries = readdirSync(entryPath);
					for (const scopedEntry of scopedEntries) {
						const scopedPkgPath = join(entryPath, scopedEntry);
						// Check for nested node_modules
						const nestedNodeModules = join(scopedPkgPath, 'node_modules');
						if (existsSync(nestedNodeModules)) {
							paths.push(...findAllPackagePaths(nestedNodeModules, pkgName, visited));
						}
					}
				} catch {
					continue;
				}
			} else {
				const nestedNodeModules = join(entryPath, 'node_modules');
				if (existsSync(nestedNodeModules)) {
					paths.push(...findAllPackagePaths(nestedNodeModules, pkgName, visited));
				}
			}
		}
	} catch (err) {
		// Ignore errors from reading directories
	}
	
	return paths;
}

function patchPackage(pkgName, additionalExports) {
	const allPaths = findAllPackagePaths(nodeModules, pkgName);
	
	// Also check known problematic nested locations explicitly
	const knownNestedPaths = [
		join(nodeModules, 'nostr-tools', 'node_modules', pkgName, 'package.json'),
		join(nodeModules, '@nostr-dev-kit', 'ndk', 'node_modules', pkgName, 'package.json'),
		join(nodeModules, '@cashu', 'cashu-ts', 'node_modules', pkgName, 'package.json'),
		join(nodeModules, '@scure', 'bip32', 'node_modules', pkgName, 'package.json'),
		join(nodeModules, '@scure', 'bip39', 'node_modules', pkgName, 'package.json'),
	];
	
	for (const knownPath of knownNestedPaths) {
		if (existsSync(knownPath) && !allPaths.includes(knownPath)) {
			allPaths.push(knownPath);
		}
	}
	
	if (allPaths.length === 0) {
		console.log(`⚠️  ${pkgName} not found, skipping`);
		return;
	}
	
	let totalPatched = 0;
	for (const pkgPath of allPaths) {
		const result = patchPackageAtPath(pkgPath, additionalExports);
		if (result > 0) {
			totalPatched += result;
			console.log(`✅ Patched ${pkgPath.replace(nodeModules, 'node_modules')} (+${result} exports)`);
		}
	}
	
	if (totalPatched === 0) {
		console.log(`✓  ${pkgName} already patched (${allPaths.length} locations)`);
	}
}

// Patch @noble/hashes
patchPackage('@noble/hashes', {
	'./utils': './utils.js',
	'./sha256': './sha256.js',
	'./sha512': './sha512.js',
	'./hmac': './hmac.js',
	'./hkdf': './hkdf.js',
	'./pbkdf2': './pbkdf2.js',
	'./ripemd160': './ripemd160.js',
	'./sha3': './sha3.js',
	'./blake2s': './blake2s.js',
	'./blake2b': './blake2b.js',
	'./sha1': './sha1.js',
	'./crypto': './crypto.js'
});

// Patch @noble/curves
patchPackage('@noble/curves', {
	'./secp256k1': './secp256k1.js',
	'./ed25519': './ed25519.js',
	'./ed448': './ed448.js',
	'./nist': './nist.js',
	'./utils': './utils.js',
	'./webcrypto': './webcrypto.js',
	'./abstract/weierstrass': './abstract/weierstrass.js',
	'./abstract/modular': './abstract/modular.js',
	'./abstract/utils': './abstract/utils.js',
	'./abstract/curve': './abstract/curve.js',
	'./abstract/edwards': './abstract/edwards.js',
	'./abstract/hash-to-curve': './abstract/hash-to-curve.js',
	'./abstract/montgomery': './abstract/montgomery.js',
	'./abstract/bls': './abstract/bls.js',
	'./abstract/poseidon': './abstract/poseidon.js'
});

// Patch @noble/ciphers if present
patchPackage('@noble/ciphers', {
	'./utils': './utils.js',
	'./chacha': './chacha.js',
	'./aes': './aes.js',
	'./webcrypto': './webcrypto.js'
});

console.log('\n🔧 Noble packages patched for Vite compatibility');
