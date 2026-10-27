#!/usr/bin/env python3
"""
Javaneh Official Android APK Builder & Multi-Scheme Signer (v1 + v2 + v3) - v2.3.0 (Build 230)
Builds two 100% standards-compliant, 4096-page-aligned, zipaligned, signed Android APKs:
1. Javaneh-App.apk (Primary, Conflict-Free Package ID: com.javaneh.smart):
   - Eliminates any STATUS_FAILURE_CONFLICT ("تداخل با نسخه اپ") caused by residual package stubs or WebAPKs
   - Uses genuine Java keytool X.509 v3 certificate structure (with SubjectKeyIdentifier extension) backdated to 2020-2054
   - minSdkVersion=21, targetSdkVersion=33, versionCode=230, versionName="2.3.0"
2. Javaneh-Update.apk (Legacy Package ID: com.javaneh.habit):
   - Signed with the byte-for-byte original certificate from keystore/javaneh-release.jks
"""

import os
import io
import re
import glob
import zlib
import struct
import base64
import hashlib
import zipfile
import tempfile
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SCRIPTS_DIR = os.path.join(ROOT_DIR, 'scripts')
KEYSTORE_DIR = os.path.join(ROOT_DIR, 'keystore')
WEB_DIST = os.path.join(ROOT_DIR, 'web', 'dist')
WEB_PUBLIC = os.path.join(ROOT_DIR, 'web', 'public')
ROOT_PUBLIC = os.path.join(ROOT_DIR, 'public')
ROOT_DIST = os.path.join(ROOT_DIR, 'dist')

VERSION_CODE = 240
VERSION_NAME = '2.4.0'
MIN_SDK = 21
TARGET_SDK = 33


def load_keystore_and_certificates():
    """
    Extracts the RSA-2048 private key, SubjectPublicKeyInfo (294 bytes DER),
    and the genuine Java keytool X.509 v3 certificate (888 bytes DER, including
    X509v3 Subject Key Identifier extension) from keystore/javaneh-release.jks.
    Also produces a backdated X.509 v3 certificate (NotBefore = 2020-01-01 UTC)
    preserving the exact keytool TBSCertificate structure and SubjectKeyIdentifier extension.
    """
    os.makedirs(KEYSTORE_DIR, exist_ok=True)
    jks_path = os.path.join(KEYSTORE_DIR, 'javaneh-release.jks')
    key_pem_path = os.path.join(KEYSTORE_DIR, 'javaneh-signing.key.pem')
    cert_pem_path = os.path.join(KEYSTORE_DIR, 'javaneh-signing.crt.pem')
    cert_der_path = os.path.join(KEYSTORE_DIR, 'javaneh-signing.crt.der')
    orig_cert_pem_path = os.path.join(KEYSTORE_DIR, 'javaneh-orig.crt.pem')
    pub_der_path = os.path.join(KEYSTORE_DIR, 'javaneh-signing.pub.der')

    # Extract private key from JKS if not present
    if not os.path.exists(key_pem_path) and os.path.exists(jks_path):
        p_key = subprocess.run(
            ['openssl', 'pkcs12', '-in', jks_path, '-passin', 'pass:javaneh123', '-nocerts', '-nodes'],
            capture_output=True,
            check=True,
        )
        p_rsa = subprocess.run(
            ['openssl', 'rsa'],
            input=p_key.stdout,
            capture_output=True,
            check=True,
        )
        with open(key_pem_path, 'wb') as f:
            f.write(p_rsa.stdout)

    # Extract SubjectPublicKeyInfo (294 bytes DER for RSA-2048)
    subprocess.run(
        ['openssl', 'rsa', '-in', key_pem_path, '-pubout', '-outform', 'DER', '-out', pub_der_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    with open(pub_der_path, 'rb') as f:
        spki_der = f.read()

    # Extract original keytool X.509 v3 certificate DER from keystore/javaneh-release.jks
    p1 = subprocess.run(
        ['openssl', 'pkcs12', '-in', jks_path, '-passin', 'pass:javaneh123', '-nokeys', '-clcerts'],
        capture_output=True,
        check=True,
    )
    p2 = subprocess.run(
        ['openssl', 'x509', '-outform', 'DER'],
        input=p1.stdout,
        capture_output=True,
        check=True,
    )
    orig_cert_der = p2.stdout

    p_orig_pem = subprocess.run(
        ['openssl', 'x509', '-inform', 'DER'],
        input=orig_cert_der,
        capture_output=True,
        check=True,
    )
    with open(orig_cert_pem_path, 'wb') as f:
        f.write(p_orig_pem.stdout)

    # Build backdated X.509 v3 certificate preserving exact keytool TBSCertificate & SubjectKeyIdentifier
    # In orig_cert_der (888 bytes):
    #   [0:4]   = outer SEQUENCE header (30 82 03 74)
    #   [4:612] = TBSCertificate (608 bytes, including X509v3 Subject Key Identifier extension)
    #   [612:632] = SignatureAlgorithm + BIT STRING header
    #   [632:888] = 256-byte RSA-SHA256 signature
    tbs = bytearray(orig_cert_der[4:612])
    if b'261015163628Z' in tbs:
        tbs = tbs.replace(b'261015163628Z', b'200101000000Z', 1)

    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(tbs)
        tbs_path = tf.name
    try:
        sig_bytes = subprocess.check_output(
            ['openssl', 'dgst', '-sha256', '-sign', key_pem_path, tbs_path]
        )
    finally:
        os.unlink(tbs_path)

    backdated_cert_der = orig_cert_der[:4] + bytes(tbs) + orig_cert_der[612:632] + sig_bytes
    assert len(backdated_cert_der) == len(orig_cert_der), 'Backdated cert length mismatch'

    with open(cert_der_path, 'wb') as f:
        f.write(backdated_cert_der)

    subprocess.run(
        ['openssl', 'x509', '-inform', 'DER', '-in', cert_der_path, '-out', cert_pem_path],
        check=True,
    )

    return (
        key_pem_path,
        cert_pem_path,
        backdated_cert_der,
        orig_cert_pem_path,
        orig_cert_der,
        spki_der,
    )


def uleb128(val: int) -> bytes:
    out = bytearray()
    while True:
        b = val & 0x7F
        val >>= 7
        if val:
            out.append(b | 0x80)
        else:
            out.append(b)
            break
    return bytes(out)


def mutf8_encode(s: str) -> bytes:
    res = bytearray()
    for ch in s:
        cp = ord(ch)
        if cp == 0:
            res.extend(b'\xC0\x80')
        elif cp <= 0x7F:
            res.append(cp)
        elif cp <= 0x7FF:
            res.append(0xC0 | (cp >> 6))
            res.append(0x80 | (cp & 0x3F))
        else:
            res.append(0xE0 | (cp >> 12))
            res.append(0x80 | ((cp >> 6) & 0x3F))
            res.append(0x80 | (cp & 0x3F))
    return uleb128(len(s)) + bytes(res) + b'\x00'


def align4(buf: bytearray):
    while len(buf) % 4 != 0:
        buf.append(0)


def build_enhanced_dex(package_name: str) -> bytes:
    """
    Generates a complete, verified Dalvik DEX (dex\\n035\\x00) containing:
      - MainActivity (extends android.app.Activity):
        * Full WebView + WebSettings setup
        * Attaches AppWebViewClient & AppChromeClient
        * Implements onActivityResult(int, int, Intent) for:
          - requestCode 1001: <input type="file"> / avatar image upload via ValueCallback<Uri[]>
          - requestCode 1002: ACTION_CREATE_DOCUMENT native JSON backup file save
        * Implements onBackPressed()
      - AppChromeClient (extends android.webkit.WebChromeClient):
        * Implements onShowFileChooser(WebView, ValueCallback, FileChooserParams)
        * Implements onJsPrompt(WebView, String, String, String, JsPromptResult) for
          'javaneh-save:<filename>' and 'javaneh-share:<filename>'
      - AppWebViewClient (extends android.webkit.WebViewClient):
        * Implements shouldOverrideUrlLoading(WebView, String) fallback
      - R, R$attr, R$drawable, R$string
    """
    pkg_slash = package_name.replace('.', '/')

    T_ACT = f'L{pkg_slash}/MainActivity;'
    T_CHROME = f'L{pkg_slash}/AppChromeClient;'
    T_CLIENT = f'L{pkg_slash}/AppWebViewClient;'
    T_R = f'L{pkg_slash}/R;'
    T_R_ATTR = f'L{pkg_slash}/R$attr;'
    T_R_DRAW = f'L{pkg_slash}/R$drawable;'
    T_R_STR = f'L{pkg_slash}/R$string;'

    raw_strings = {
        '<init>',
        'activity',
        'app_name',
        'filePathCallback',
        'pendingSaveData',
        'webView',
        'ic_launcher',
        'MainActivity.java',
        'R.java',
        'V', 'Z', 'I', 'L', 'ILI', 'IL', 'ILL', 'LL', 'LLL', 'LLLL', 'ZLL', 'ZLLL', 'ZLLLLL',
        'Landroid/app/Activity;',
        'Landroid/content/ContentResolver;',
        'Landroid/content/Context;',
        'Landroid/content/Intent;',
        'Landroid/net/Uri;',
        '[Landroid/net/Uri;',
        'Landroid/os/Bundle;',
        'Landroid/view/View;',
        'Landroid/webkit/JsPromptResult;',
        'Landroid/webkit/ValueCallback;',
        'Landroid/webkit/WebChromeClient;',
        'Landroid/webkit/WebChromeClient$FileChooserParams;',
        'Landroid/webkit/WebSettings;',
        'Landroid/webkit/WebView;',
        'Landroid/webkit/WebViewClient;',
        'Ljava/io/OutputStream;',
        'Ljava/lang/CharSequence;',
        'Ljava/lang/Object;',
        'Ljava/lang/String;',
        '[Ljava/lang/String;',
        'Ljava/lang/Throwable;',
        '[B',
        T_ACT, T_CHROME, T_CLIENT, T_R, T_R_ATTR, T_R_DRAW, T_R_STR,
        'addCategory',
        'canGoBack',
        'close',
        'confirm',
        'createChooser',
        'decode',
        'flush',
        'getAcceptTypes',
        'getBytes',
        'getContentResolver',
        'getData',
        'getSettings',
        'goBack',
        'indexOf',
        'loadUrl',
        'onActivityResult',
        'onBackPressed',
        'onCreate',
        'onJsPrompt',
        'onReceiveValue',
        'onShowFileChooser',
        'openOutputStream',
        'parseResult',
        'putExtra',
        'requestWindowFeature',
        'setAllowContentAccess',
        'setAllowFileAccess',
        'setAllowFileAccessFromFileURLs',
        'setAllowUniversalAccessFromFileURLs',
        'setContentView',
        'setDatabaseEnabled',
        'setDomStorageEnabled',
        'setJavaScriptEnabled',
        'setLoadWithOverviewMode',
        'setMediaPlaybackRequiresUserGesture',
        'setType',
        'setUseWideViewPort',
        'setWebChromeClient',
        'setWebViewClient',
        'shouldOverrideUrlLoading',
        'startActivity',
        'startActivityForResult',
        'startsWith',
        'substring',
        'write',
        'file:///android_asset/index.html',
        'android.intent.action.GET_CONTENT',
        'android.intent.action.CREATE_DOCUMENT',
        'android.intent.action.SEND',
        'android.intent.category.OPENABLE',
        'android.intent.extra.TITLE',
        'android.intent.extra.TEXT',
        '*/*',
        'image/*',
        'image',
        'application/json',
        'text/plain',
        'UTF-8',
        'OK',
        'javaneh-save:',
        'javaneh-share:',
        '?data=',
        '?text=',
        'انتخاب فایل یا تصویر',
        'اشتراک‌گذاری نسخه پشتیبان',
    }

    def shorty_for(ret_t, params):
        def sc(t):
            if t in ('V', 'Z', 'I'):
                return t
            return 'L'
        return sc(ret_t) + ''.join(sc(p) for p in params)

    proto_defs = [
        ('V', 'V', ()),
        ('VL', 'V', (T_ACT,)),
        ('VL', 'V', ('Landroid/content/Context;',)),
        ('VL', 'V', ('Landroid/os/Bundle;',)),
        ('VL', 'V', ('Landroid/view/View;',)),
        ('VL', 'V', ('Landroid/webkit/WebChromeClient;',)),
        ('VL', 'V', ('Landroid/webkit/WebViewClient;',)),
        ('VL', 'V', ('Ljava/lang/Object;',)),
        ('VL', 'V', ('Ljava/lang/String;',)),
        ('VL', 'V', ('[B',)),
        ('VZ', 'V', ('Z',)),
        ('VI', 'Z', ('I',)),
        ('VLL', 'V', ('Landroid/content/Intent;', 'I')),
        ('VIIL', 'V', ('I', 'I', 'Landroid/content/Intent;')),
        ('Z', 'Z', ()),
        ('ZL', 'Z', ('Ljava/lang/String;',)),
        ('ZLL', 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;')),
        ('ZLLL', 'Z', ('Landroid/webkit/WebView;', 'Landroid/webkit/ValueCallback;', 'Landroid/webkit/WebChromeClient$FileChooserParams;')),
        ('ZLLLLL', 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Landroid/webkit/JsPromptResult;')),
        ('II', 'I', ('Ljava/lang/String;',)),
        ('L', 'Landroid/content/ContentResolver;', ()),
        ('L', 'Landroid/net/Uri;', ()),
        ('L', 'Landroid/webkit/WebSettings;', ()),
        ('L', '[Ljava/lang/String;', ()),
        ('LL', 'Landroid/content/Intent;', ('Ljava/lang/String;',)),
        ('LLL', 'Landroid/content/Intent;', ('Landroid/content/Intent;', 'Ljava/lang/CharSequence;')),
        ('LLL', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;')),
        ('LIL', '[Landroid/net/Uri;', ('I', 'Landroid/content/Intent;')),
        ('LL', 'Ljava/io/OutputStream;', ('Landroid/net/Uri;',)),
        ('LI', 'Ljava/lang/String;', ('I',)),
        ('LII', 'Ljava/lang/String;', ('I', 'I')),
        ('LL', 'Ljava/lang/String;', ('Ljava/lang/String;',)),
        ('LL', '[B', ('Ljava/lang/String;',)),
        ('VL', 'V', ('Landroid/content/Intent;',)),
    ]

    unique_protos = {}
    for _, ret_t, params in proto_defs:
        sh = shorty_for(ret_t, params)
        raw_strings.add(sh)
        unique_protos[(ret_t, params)] = sh

    strings = sorted(raw_strings)
    str_idx = {s: i for i, s in enumerate(strings)}

    type_descs = sorted([
        'V', 'Z', 'I', '[B',
        'Landroid/app/Activity;',
        'Landroid/content/ContentResolver;',
        'Landroid/content/Context;',
        'Landroid/content/Intent;',
        'Landroid/net/Uri;',
        '[Landroid/net/Uri;',
        'Landroid/os/Bundle;',
        'Landroid/view/View;',
        'Landroid/webkit/JsPromptResult;',
        'Landroid/webkit/ValueCallback;',
        'Landroid/webkit/WebChromeClient;',
        'Landroid/webkit/WebChromeClient$FileChooserParams;',
        'Landroid/webkit/WebSettings;',
        'Landroid/webkit/WebView;',
        'Landroid/webkit/WebViewClient;',
        'Ljava/io/OutputStream;',
        'Ljava/lang/CharSequence;',
        'Ljava/lang/Object;',
        'Ljava/lang/String;',
        '[Ljava/lang/String;',
        'Ljava/lang/Throwable;',
        T_ACT, T_CHROME, T_CLIENT, T_R, T_R_ATTR, T_R_DRAW, T_R_STR,
    ], key=lambda t: str_idx[t])
    type_idx = {t: i for i, t in enumerate(type_descs)}

    sorted_protos = sorted(
        unique_protos.keys(),
        key=lambda k: (type_idx[k[0]], tuple(type_idx[p] for p in k[1]))
    )
    proto_idx = {k: i for i, k in enumerate(sorted_protos)}

    field_defs = [
        (T_CHROME, T_ACT, 'activity'),
        (T_CLIENT, T_ACT, 'activity'),
        (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback'),
        (T_ACT, 'Ljava/lang/String;', 'pendingSaveData'),
        (T_ACT, 'Landroid/webkit/WebView;', 'webView'),
        (T_R_DRAW, 'I', 'ic_launcher'),
        (T_R_STR, 'I', 'app_name'),
    ]
    sorted_fields = sorted(
        field_defs,
        key=lambda f: (type_idx[f[0]], str_idx[f[2]], type_idx[f[1]])
    )
    field_idx = {f: i for i, f in enumerate(sorted_fields)}

    method_defs = [
        ('Landroid/app/Activity;', 'V', (), '<init>'),
        ('Landroid/app/Activity;', 'Landroid/content/ContentResolver;', (), 'getContentResolver'),
        ('Landroid/app/Activity;', 'V', ('I', 'I', 'Landroid/content/Intent;'), 'onActivityResult'),
        ('Landroid/app/Activity;', 'V', (), 'onBackPressed'),
        ('Landroid/app/Activity;', 'V', ('Landroid/os/Bundle;',), 'onCreate'),
        ('Landroid/app/Activity;', 'Z', ('I',), 'requestWindowFeature'),
        ('Landroid/app/Activity;', 'V', ('Landroid/view/View;',), 'setContentView'),
        ('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;',), 'startActivity'),
        ('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;', 'I'), 'startActivityForResult'),
        ('Landroid/content/ContentResolver;', 'Ljava/io/OutputStream;', ('Landroid/net/Uri;',), 'openOutputStream'),
        ('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'),
        ('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'addCategory'),
        ('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Landroid/content/Intent;', 'Ljava/lang/CharSequence;'), 'createChooser'),
        ('Landroid/content/Intent;', 'Landroid/net/Uri;', (), 'getData'),
        ('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;'), 'putExtra'),
        ('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'),
        ('Landroid/net/Uri;', 'Ljava/lang/String;', ('Ljava/lang/String;',), 'decode'),
        ('Landroid/webkit/JsPromptResult;', 'V', ('Ljava/lang/String;',), 'confirm'),
        ('Landroid/webkit/ValueCallback;', 'V', ('Ljava/lang/Object;',), 'onReceiveValue'),
        ('Landroid/webkit/WebChromeClient;', 'V', (), '<init>'),
        ('Landroid/webkit/WebChromeClient$FileChooserParams;', '[Ljava/lang/String;', (), 'getAcceptTypes'),
        ('Landroid/webkit/WebChromeClient$FileChooserParams;', '[Landroid/net/Uri;', ('I', 'Landroid/content/Intent;'), 'parseResult'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowContentAccess'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowFileAccess'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowFileAccessFromFileURLs'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowUniversalAccessFromFileURLs'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setDatabaseEnabled'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setDomStorageEnabled'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setJavaScriptEnabled'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setLoadWithOverviewMode'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setMediaPlaybackRequiresUserGesture'),
        ('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setUseWideViewPort'),
        ('Landroid/webkit/WebView;', 'V', ('Landroid/content/Context;',), '<init>'),
        ('Landroid/webkit/WebView;', 'Z', (), 'canGoBack'),
        ('Landroid/webkit/WebView;', 'Landroid/webkit/WebSettings;', (), 'getSettings'),
        ('Landroid/webkit/WebView;', 'V', (), 'goBack'),
        ('Landroid/webkit/WebView;', 'V', ('Ljava/lang/String;',), 'loadUrl'),
        ('Landroid/webkit/WebView;', 'V', ('Landroid/webkit/WebChromeClient;',), 'setWebChromeClient'),
        ('Landroid/webkit/WebView;', 'V', ('Landroid/webkit/WebViewClient;',), 'setWebViewClient'),
        ('Landroid/webkit/WebViewClient;', 'V', (), '<init>'),
        ('Ljava/io/OutputStream;', 'V', (), 'close'),
        ('Ljava/io/OutputStream;', 'V', (), 'flush'),
        ('Ljava/io/OutputStream;', 'V', ('[B',), 'write'),
        ('Ljava/lang/Object;', 'V', (), '<init>'),
        ('Ljava/lang/String;', '[B', ('Ljava/lang/String;',), 'getBytes'),
        ('Ljava/lang/String;', 'I', ('Ljava/lang/String;',), 'indexOf'),
        ('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'),
        ('Ljava/lang/String;', 'Ljava/lang/String;', ('I',), 'substring'),
        ('Ljava/lang/String;', 'Ljava/lang/String;', ('I', 'I'), 'substring'),
        (T_CHROME, 'V', (T_ACT,), '<init>'),
        (T_CHROME, 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Landroid/webkit/JsPromptResult;'), 'onJsPrompt'),
        (T_CHROME, 'Z', ('Landroid/webkit/WebView;', 'Landroid/webkit/ValueCallback;', 'Landroid/webkit/WebChromeClient$FileChooserParams;'), 'onShowFileChooser'),
        (T_CLIENT, 'V', (T_ACT,), '<init>'),
        (T_CLIENT, 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;'), 'shouldOverrideUrlLoading'),
        (T_ACT, 'V', (), '<init>'),
        (T_ACT, 'V', ('I', 'I', 'Landroid/content/Intent;'), 'onActivityResult'),
        (T_ACT, 'V', (), 'onBackPressed'),
        (T_ACT, 'V', ('Landroid/os/Bundle;',), 'onCreate'),
        (T_R, 'V', (), '<init>'),
        (T_R_ATTR, 'V', (), '<init>'),
        (T_R_DRAW, 'V', (), '<init>'),
        (T_R_STR, 'V', (), '<init>'),
    ]
    sorted_methods = sorted(
        method_defs,
        key=lambda m: (type_idx[m[0]], str_idx[m[3]], proto_idx[(m[1], m[2])])
    )
    method_idx = {m: i for i, m in enumerate(sorted_methods)}

    def insn_invoke(op, count, idx, regs):
        r = list(regs) + [0] * (5 - len(regs))
        b0 = ((count & 0xF) << 4) | (r[4] & 0xF)
        w1 = (r[3] << 12) | (r[2] << 8) | (r[1] << 4) | r[0]
        return struct.pack('<BBHH', op, b0, idx, w1)

    def invoke_virtual(m_key, *regs):
        return insn_invoke(0x6E, len(regs), method_idx[m_key], regs)

    def invoke_super(m_key, *regs):
        return insn_invoke(0x6F, len(regs), method_idx[m_key], regs)

    def invoke_direct(m_key, *regs):
        return insn_invoke(0x70, len(regs), method_idx[m_key], regs)

    def invoke_static(m_key, *regs):
        return insn_invoke(0x71, len(regs), method_idx[m_key], regs)

    def invoke_interface(m_key, *regs):
        return insn_invoke(0x72, len(regs), method_idx[m_key], regs)

    def const_string(vA, s):
        return struct.pack('<BBH', 0x1A, vA, str_idx[s])

    def const_4(vA, val):
        return struct.pack('<BB', 0x12, ((val & 0xF) << 4) | (vA & 0xF))

    def const_16(vA, val):
        return struct.pack('<BBh', 0x13, vA, val)

    def new_instance(vA, t):
        return struct.pack('<BBH', 0x22, vA, type_idx[t])

    def new_array(vA, vB, t):
        return struct.pack('<BBH', 0x23, (vB << 4) | vA, type_idx[t])

    def array_length(vA, vB):
        return struct.pack('<BB', 0x21, (vB << 4) | vA)

    def aget_object(vA, vB, vC):
        return struct.pack('<BBBB', 0x46, vA, vB, vC)

    def aput_object(vA, vB, vC):
        return struct.pack('<BBBB', 0x4D, vA, vB, vC)

    def iget_object(vA, vB, f_key):
        return struct.pack('<BBH', 0x54, (vB << 4) | vA, field_idx[f_key])

    def iput_object(vA, vB, f_key):
        return struct.pack('<BBH', 0x5B, (vB << 4) | vA, field_idx[f_key])

    def move_result(vA):
        return struct.pack('<BB', 0x0A, vA)

    def move_result_object(vA):
        return struct.pack('<BB', 0x0C, vA)

    def return_void():
        return struct.pack('<BB', 0x0E, 0)

    def return_val(vA):
        return struct.pack('<BB', 0x0F, vA)

    def if_eq(vA, vB, rel_words):
        return struct.pack('<BBh', 0x32, (vB << 4) | vA, rel_words)

    def if_ne(vA, vB, rel_words):
        return struct.pack('<BBh', 0x33, (vB << 4) | vA, rel_words)

    def if_eqz(vA, rel_words):
        return struct.pack('<BBh', 0x38, vA, rel_words)

    def if_nez(vA, rel_words):
        return struct.pack('<BBh', 0x39, vA, rel_words)

    def if_le(vA, vB, rel_words):
        return struct.pack('<BBh', 0x35, (vB << 4) | vA, rel_words)

    def make_code_item(registers_size, ins_size, outs_size, insns_bytes, tries=None):
        insns_words = len(insns_bytes) // 2
        if not tries:
            header = struct.pack('<HHHHII', registers_size, ins_size, outs_size, 0, 0, insns_words)
            return header + insns_bytes
        else:
            pad = b'\x00\x00' if insns_words % 2 == 1 else b''
            header = struct.pack('<HHHHII', registers_size, ins_size, outs_size, len(tries), 0, insns_words)
            try_bytes = bytearray()
            handler_list = bytearray()
            handler_list.extend(uleb128(len(tries)))
            for start_addr, insn_count, handler_addr in tries:
                h_off = len(handler_list)
                handler_list.extend(b'\x00')
                handler_list.extend(uleb128(handler_addr))
                try_bytes.extend(struct.pack('<IHH', start_addr, insn_count, h_off))
            return header + insns_bytes + pad + bytes(try_bytes) + bytes(handler_list)

    class Asm:
        def __init__(self):
            self.items = []

        def emit(self, b: bytes):
            self.items.append(('BYTES', b))

        def label(self, name: str):
            self.items.append(('LABEL', name))

        def branch(self, fn, *args, target: str):
            self.items.append(('BRANCH', fn, args, target))

        def assemble(self):
            pos = 0
            labels = {}
            for kind, *rest in self.items:
                if kind == 'BYTES':
                    pos += len(rest[0]) // 2
                elif kind == 'LABEL':
                    labels[rest[0]] = pos
                elif kind == 'BRANCH':
                    pos += 2
            out = bytearray()
            pos = 0
            for kind, *rest in self.items:
                if kind == 'BYTES':
                    out.extend(rest[0])
                    pos += len(rest[0]) // 2
                elif kind == 'LABEL':
                    pass
                elif kind == 'BRANCH':
                    fn, args, target = rest
                    rel = labels[target] - pos
                    b = fn(*args, rel)
                    out.extend(b)
                    pos += len(b) // 2
            return bytes(out), labels

    # 1. R, R$attr, R$drawable, R$string <init>()V
    a = Asm()
    a.emit(invoke_direct(('Ljava/lang/Object;', 'V', (), '<init>'), 0))
    a.emit(return_void())
    ins_obj_init, _ = a.assemble()
    code_r_attr_init = bytearray(make_code_item(1, 1, 1, ins_obj_init))
    code_r_draw_init = bytearray(make_code_item(1, 1, 1, ins_obj_init))
    code_r_str_init = bytearray(make_code_item(1, 1, 1, ins_obj_init))
    code_r_init = bytearray(make_code_item(1, 1, 1, ins_obj_init))

    # 2. AppChromeClient.<init>(MainActivity)V
    a = Asm()
    a.emit(invoke_direct(('Landroid/webkit/WebChromeClient;', 'V', (), '<init>'), 0))
    a.emit(iput_object(1, 0, (T_CHROME, T_ACT, 'activity')))
    a.emit(return_void())
    ins_chrome_init, _ = a.assemble()
    code_chrome_init = make_code_item(2, 2, 1, ins_chrome_init)

    # 3. AppChromeClient.onShowFileChooser
    a = Asm()
    a.label('try_start')
    a.emit(iget_object(0, 5, (T_CHROME, T_ACT, 'activity')))
    a.emit(iget_object(1, 0, (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback')))
    a.branch(if_eqz, 1, target='no_prev_cb')
    a.emit(const_4(2, 0))
    a.emit(invoke_interface(('Landroid/webkit/ValueCallback;', 'V', ('Ljava/lang/Object;',), 'onReceiveValue'), 1, 2))
    a.emit(iput_object(2, 0, (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback')))
    a.label('no_prev_cb')
    a.emit(iput_object(7, 0, (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback')))
    a.emit(new_instance(1, 'Landroid/content/Intent;'))
    a.emit(const_string(2, 'android.intent.action.GET_CONTENT'))
    a.emit(invoke_direct(('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'), 1, 2))
    a.emit(const_string(2, 'android.intent.category.OPENABLE'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'addCategory'), 1, 2))
    a.emit(const_string(2, '*/*'))
    a.branch(if_eqz, 8, target='set_mime')
    a.emit(invoke_virtual(('Landroid/webkit/WebChromeClient$FileChooserParams;', '[Ljava/lang/String;', (), 'getAcceptTypes'), 8))
    a.emit(move_result_object(3))
    a.branch(if_eqz, 3, target='set_mime')
    a.emit(array_length(4, 3))
    a.branch(if_eqz, 4, target='set_mime')
    a.emit(const_4(4, 0))
    a.emit(aget_object(3, 3, 4))
    a.branch(if_eqz, 3, target='set_mime')
    a.emit(const_string(4, 'image'))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'), 3, 4))
    a.emit(move_result(4))
    a.branch(if_eqz, 4, target='set_mime')
    a.emit(const_string(2, 'image/*'))
    a.label('set_mime')
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'), 1, 2))
    a.emit(const_string(2, 'انتخاب فایل یا تصویر'))
    a.emit(invoke_static(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Landroid/content/Intent;', 'Ljava/lang/CharSequence;'), 'createChooser'), 1, 2))
    a.emit(move_result_object(1))
    a.emit(const_16(2, 1001))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;', 'I'), 'startActivityForResult'), 0, 1, 2))
    a.emit(const_4(0, 1))
    a.emit(return_val(0))
    a.label('try_end')
    a.label('catch_all')
    a.emit(const_4(0, 0))
    a.emit(return_val(0))
    ins_show_fc, lbl_fc = a.assemble()
    code_show_fc = make_code_item(
        9, 4, 3, ins_show_fc,
        tries=[(lbl_fc['try_start'], lbl_fc['try_end'] - lbl_fc['try_start'], lbl_fc['catch_all'])]
    )

    # 4. AppChromeClient.onJsPrompt
    a = Asm()
    a.label('try_start')
    a.branch(if_eqz, 7, target='not_handled')
    a.emit(const_string(0, 'javaneh-save:'))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'), 7, 0))
    a.emit(move_result(0))
    a.branch(if_eqz, 0, target='check_share')
    a.emit(const_16(0, 13))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Ljava/lang/String;', ('I',), 'substring'), 7, 0))
    a.emit(move_result_object(0))
    a.emit(iget_object(1, 4, (T_CHROME, T_ACT, 'activity')))
    a.emit(iput_object(8, 1, (T_ACT, 'Ljava/lang/String;', 'pendingSaveData')))
    a.emit(new_instance(2, 'Landroid/content/Intent;'))
    a.emit(const_string(3, 'android.intent.action.CREATE_DOCUMENT'))
    a.emit(invoke_direct(('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'), 2, 3))
    a.emit(const_string(3, 'android.intent.category.OPENABLE'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'addCategory'), 2, 3))
    a.emit(const_string(3, 'application/json'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'), 2, 3))
    a.emit(const_string(3, 'android.intent.extra.TITLE'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;'), 'putExtra'), 2, 3, 0))
    a.emit(const_16(3, 1002))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;', 'I'), 'startActivityForResult'), 1, 2, 3))
    a.emit(const_string(0, 'OK'))
    a.emit(invoke_virtual(('Landroid/webkit/JsPromptResult;', 'V', ('Ljava/lang/String;',), 'confirm'), 9, 0))
    a.emit(const_4(0, 1))
    a.emit(return_val(0))

    a.label('check_share')
    a.emit(const_string(0, 'javaneh-share:'))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'), 7, 0))
    a.emit(move_result(0))
    a.branch(if_eqz, 0, target='not_handled')
    a.emit(iget_object(1, 4, (T_CHROME, T_ACT, 'activity')))
    a.emit(new_instance(2, 'Landroid/content/Intent;'))
    a.emit(const_string(3, 'android.intent.action.SEND'))
    a.emit(invoke_direct(('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'), 2, 3))
    a.emit(const_string(3, 'text/plain'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'), 2, 3))
    a.emit(const_string(3, 'android.intent.extra.TEXT'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;'), 'putExtra'), 2, 3, 8))
    a.emit(const_string(3, 'اشتراک‌گذاری نسخه پشتیبان'))
    a.emit(invoke_static(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Landroid/content/Intent;', 'Ljava/lang/CharSequence;'), 'createChooser'), 2, 3))
    a.emit(move_result_object(2))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;',), 'startActivity'), 1, 2))
    a.emit(const_string(0, 'OK'))
    a.emit(invoke_virtual(('Landroid/webkit/JsPromptResult;', 'V', ('Ljava/lang/String;',), 'confirm'), 9, 0))
    a.emit(const_4(0, 1))
    a.emit(return_val(0))
    a.label('try_end')
    a.label('catch_all')
    a.label('not_handled')
    a.emit(const_4(0, 0))
    a.emit(return_val(0))
    ins_jsprompt, lbl_jp = a.assemble()
    code_jsprompt = make_code_item(
        10, 6, 3, ins_jsprompt,
        tries=[(lbl_jp['try_start'], lbl_jp['try_end'] - lbl_jp['try_start'], lbl_jp['catch_all'])]
    )

    # 5. AppWebViewClient.<init>(MainActivity)V
    a = Asm()
    a.emit(invoke_direct(('Landroid/webkit/WebViewClient;', 'V', (), '<init>'), 0))
    a.emit(iput_object(1, 0, (T_CLIENT, T_ACT, 'activity')))
    a.emit(return_void())
    ins_client_init, _ = a.assemble()
    code_client_init = make_code_item(2, 2, 1, ins_client_init)

    # 6. AppWebViewClient.shouldOverrideUrlLoading(WebView, String)Z
    a = Asm()
    a.label('try_start')
    a.branch(if_eqz, 7, target='ret_false')
    a.emit(const_string(0, 'javaneh-save:'))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'), 7, 0))
    a.emit(move_result(0))
    a.branch(if_eqz, 0, target='check_share_url')
    a.emit(const_string(0, '?data='))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'I', ('Ljava/lang/String;',), 'indexOf'), 7, 0))
    a.emit(move_result(0))
    a.emit(const_4(1, 0))
    a.branch(if_le, 0, 1, target='ret_true')
    a.emit(const_16(1, 13))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Ljava/lang/String;', ('I', 'I'), 'substring'), 7, 1, 0))
    a.emit(move_result_object(1))
    a.emit(invoke_static(('Landroid/net/Uri;', 'Ljava/lang/String;', ('Ljava/lang/String;',), 'decode'), 1))
    a.emit(move_result_object(1))
    a.emit(const_16(2, 6))
    a.emit(struct.pack('<BBBB', 0x90, 0, 0, 2))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Ljava/lang/String;', ('I',), 'substring'), 7, 0))
    a.emit(move_result_object(2))
    a.emit(invoke_static(('Landroid/net/Uri;', 'Ljava/lang/String;', ('Ljava/lang/String;',), 'decode'), 2))
    a.emit(move_result_object(2))
    a.emit(iget_object(3, 5, (T_CLIENT, T_ACT, 'activity')))
    a.emit(iput_object(2, 3, (T_ACT, 'Ljava/lang/String;', 'pendingSaveData')))
    a.emit(new_instance(2, 'Landroid/content/Intent;'))
    a.emit(const_string(4, 'android.intent.action.CREATE_DOCUMENT'))
    a.emit(invoke_direct(('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'), 2, 4))
    a.emit(const_string(4, 'android.intent.category.OPENABLE'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'addCategory'), 2, 4))
    a.emit(const_string(4, 'application/json'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'), 2, 4))
    a.emit(const_string(4, 'android.intent.extra.TITLE'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;'), 'putExtra'), 2, 4, 1))
    a.emit(const_16(4, 1002))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;', 'I'), 'startActivityForResult'), 3, 2, 4))
    a.label('ret_true')
    a.emit(const_4(0, 1))
    a.emit(return_val(0))

    a.label('check_share_url')
    a.emit(const_string(0, 'javaneh-share:'))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Z', ('Ljava/lang/String;',), 'startsWith'), 7, 0))
    a.emit(move_result(0))
    a.branch(if_eqz, 0, target='ret_false')
    a.emit(const_string(0, '?text='))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'I', ('Ljava/lang/String;',), 'indexOf'), 7, 0))
    a.emit(move_result(0))
    a.emit(const_4(1, 0))
    a.branch(if_le, 0, 1, target='ret_true')
    a.emit(const_16(2, 6))
    a.emit(struct.pack('<BBBB', 0x90, 0, 0, 2))
    a.emit(invoke_virtual(('Ljava/lang/String;', 'Ljava/lang/String;', ('I',), 'substring'), 7, 0))
    a.emit(move_result_object(2))
    a.emit(invoke_static(('Landroid/net/Uri;', 'Ljava/lang/String;', ('Ljava/lang/String;',), 'decode'), 2))
    a.emit(move_result_object(2))
    a.emit(iget_object(3, 5, (T_CLIENT, T_ACT, 'activity')))
    a.emit(new_instance(1, 'Landroid/content/Intent;'))
    a.emit(const_string(4, 'android.intent.action.SEND'))
    a.emit(invoke_direct(('Landroid/content/Intent;', 'V', ('Ljava/lang/String;',), '<init>'), 1, 4))
    a.emit(const_string(4, 'text/plain'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;',), 'setType'), 1, 4))
    a.emit(const_string(4, 'android.intent.extra.TEXT'))
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Ljava/lang/String;', 'Ljava/lang/String;'), 'putExtra'), 1, 4, 2))
    a.emit(const_string(4, 'اشتراک‌گذاری نسخه پشتیبان'))
    a.emit(invoke_static(('Landroid/content/Intent;', 'Landroid/content/Intent;', ('Landroid/content/Intent;', 'Ljava/lang/CharSequence;'), 'createChooser'), 1, 4))
    a.emit(move_result_object(1))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/content/Intent;',), 'startActivity'), 3, 1))
    a.emit(const_4(0, 1))
    a.emit(return_val(0))
    a.label('try_end')
    a.label('catch_all')
    a.label('ret_false')
    a.emit(const_4(0, 0))
    a.emit(return_val(0))
    ins_override_url, lbl_ou = a.assemble()
    code_override_url = make_code_item(
        8, 3, 3, ins_override_url,
        tries=[(lbl_ou['try_start'], lbl_ou['try_end'] - lbl_ou['try_start'], lbl_ou['catch_all'])]
    )

    # 7. MainActivity.<init>()V
    a = Asm()
    a.emit(invoke_direct(('Landroid/app/Activity;', 'V', (), '<init>'), 0))
    a.emit(return_void())
    ins_act_init, _ = a.assemble()
    code_act_init = make_code_item(1, 1, 1, ins_act_init)

    # 8. MainActivity.onCreate(Bundle)V
    a = Asm()
    a.emit(invoke_super(('Landroid/app/Activity;', 'V', ('Landroid/os/Bundle;',), 'onCreate'), 3, 4))
    a.emit(const_4(0, 1))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'Z', ('I',), 'requestWindowFeature'), 3, 0))
    a.emit(new_instance(1, 'Landroid/webkit/WebView;'))
    a.emit(invoke_direct(('Landroid/webkit/WebView;', 'V', ('Landroid/content/Context;',), '<init>'), 1, 3))
    a.emit(iput_object(1, 3, (T_ACT, 'Landroid/webkit/WebView;', 'webView')))
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'Landroid/webkit/WebSettings;', (), 'getSettings'), 1))
    a.emit(move_result_object(2))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setJavaScriptEnabled'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setDomStorageEnabled'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setDatabaseEnabled'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowFileAccess'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowContentAccess'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowFileAccessFromFileURLs'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setAllowUniversalAccessFromFileURLs'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setUseWideViewPort'), 2, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setLoadWithOverviewMode'), 2, 0))
    a.emit(const_4(0, 0))
    a.emit(invoke_virtual(('Landroid/webkit/WebSettings;', 'V', ('Z',), 'setMediaPlaybackRequiresUserGesture'), 2, 0))
    a.emit(new_instance(2, T_CLIENT))
    a.emit(invoke_direct((T_CLIENT, 'V', (T_ACT,), '<init>'), 2, 3))
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'V', ('Landroid/webkit/WebViewClient;',), 'setWebViewClient'), 1, 2))
    a.emit(new_instance(2, T_CHROME))
    a.emit(invoke_direct((T_CHROME, 'V', (T_ACT,), '<init>'), 2, 3))
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'V', ('Landroid/webkit/WebChromeClient;',), 'setWebChromeClient'), 1, 2))
    a.emit(const_string(2, 'file:///android_asset/index.html'))
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'V', ('Ljava/lang/String;',), 'loadUrl'), 1, 2))
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'V', ('Landroid/view/View;',), 'setContentView'), 3, 1))
    a.emit(return_void())
    ins_oncreate, _ = a.assemble()
    code_oncreate = make_code_item(5, 2, 2, ins_oncreate)

    # 9. MainActivity.onActivityResult(int, int, Intent)V
    a = Asm()
    a.emit(invoke_super(('Landroid/app/Activity;', 'V', ('I', 'I', 'Landroid/content/Intent;'), 'onActivityResult'), 5, 6, 7, 8))
    a.label('try_start')
    a.emit(const_16(0, 1001))
    a.branch(if_ne, 6, 0, target='check_1002')
    a.emit(iget_object(0, 5, (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback')))
    a.branch(if_eqz, 0, target='done')
    a.emit(const_4(1, 0))
    a.emit(invoke_static(('Landroid/webkit/WebChromeClient$FileChooserParams;', '[Landroid/net/Uri;', ('I', 'Landroid/content/Intent;'), 'parseResult'), 7, 8))
    a.emit(move_result_object(1))
    a.branch(if_nez, 1, target='deliver_cb')
    a.emit(const_4(2, -1))
    a.branch(if_ne, 7, 2, target='deliver_cb')
    a.branch(if_eqz, 8, target='deliver_cb')
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/net/Uri;', (), 'getData'), 8))
    a.emit(move_result_object(2))
    a.branch(if_eqz, 2, target='deliver_cb')
    a.emit(const_4(3, 1))
    a.emit(new_array(1, 3, '[Landroid/net/Uri;'))
    a.emit(const_4(3, 0))
    a.emit(aput_object(2, 1, 3))
    a.label('deliver_cb')
    a.emit(invoke_interface(('Landroid/webkit/ValueCallback;', 'V', ('Ljava/lang/Object;',), 'onReceiveValue'), 0, 1))
    a.emit(const_4(2, 0))
    a.emit(iput_object(2, 5, (T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback')))
    a.emit(return_void())

    a.label('check_1002')
    a.emit(const_16(0, 1002))
    a.branch(if_ne, 6, 0, target='done')
    a.emit(iget_object(0, 5, (T_ACT, 'Ljava/lang/String;', 'pendingSaveData')))
    a.emit(const_4(1, 0))
    a.emit(iput_object(1, 5, (T_ACT, 'Ljava/lang/String;', 'pendingSaveData')))
    a.emit(const_4(1, -1))
    a.branch(if_ne, 7, 1, target='done')
    a.branch(if_eqz, 8, target='done')
    a.branch(if_eqz, 0, target='done')
    a.emit(invoke_virtual(('Landroid/content/Intent;', 'Landroid/net/Uri;', (), 'getData'), 8))
    a.emit(move_result_object(1))
    a.branch(if_eqz, 1, target='done')
    a.emit(invoke_virtual(('Landroid/app/Activity;', 'Landroid/content/ContentResolver;', (), 'getContentResolver'), 5))
    a.emit(move_result_object(2))
    a.emit(invoke_virtual(('Landroid/content/ContentResolver;', 'Ljava/io/OutputStream;', ('Landroid/net/Uri;',), 'openOutputStream'), 2, 1))
    a.emit(move_result_object(2))
    a.branch(if_eqz, 2, target='done')
    a.emit(const_string(3, 'UTF-8'))
    a.emit(invoke_virtual(('Ljava/lang/String;', '[B', ('Ljava/lang/String;',), 'getBytes'), 0, 3))
    a.emit(move_result_object(3))
    a.emit(invoke_virtual(('Ljava/io/OutputStream;', 'V', ('[B',), 'write'), 2, 3))
    a.emit(invoke_virtual(('Ljava/io/OutputStream;', 'V', (), 'flush'), 2))
    a.emit(invoke_virtual(('Ljava/io/OutputStream;', 'V', (), 'close'), 2))
    a.label('try_end')
    a.label('catch_all')
    a.label('done')
    a.emit(return_void())
    ins_act_res, lbl_ar = a.assemble()
    code_act_res = make_code_item(
        9, 4, 4, ins_act_res,
        tries=[(lbl_ar['try_start'], lbl_ar['try_end'] - lbl_ar['try_start'], lbl_ar['catch_all'])]
    )

    # 10. MainActivity.onBackPressed()V
    a = Asm()
    a.emit(iget_object(0, 2, (T_ACT, 'Landroid/webkit/WebView;', 'webView')))
    a.branch(if_eqz, 0, target='super_back')
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'Z', (), 'canGoBack'), 0))
    a.emit(move_result(1))
    a.branch(if_eqz, 1, target='super_back')
    a.emit(invoke_virtual(('Landroid/webkit/WebView;', 'V', (), 'goBack'), 0))
    a.emit(return_void())
    a.label('super_back')
    a.emit(invoke_super(('Landroid/app/Activity;', 'V', (), 'onBackPressed'), 2))
    a.emit(return_void())
    ins_back, _ = a.assemble()
    code_back = make_code_item(3, 1, 1, ins_back)

    class_specs = [
        (
            T_CHROME, 0x0001, 'Landroid/webkit/WebChromeClient;', 'MainActivity.java',
            [],
            [((T_CHROME, T_ACT, 'activity'), 0x0010)],
            [((T_CHROME, 'V', (T_ACT,), '<init>'), 0x10001, code_chrome_init)],
            [
                ((T_CHROME, 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Ljava/lang/String;', 'Landroid/webkit/JsPromptResult;'), 'onJsPrompt'), 0x0001, code_jsprompt),
                ((T_CHROME, 'Z', ('Landroid/webkit/WebView;', 'Landroid/webkit/ValueCallback;', 'Landroid/webkit/WebChromeClient$FileChooserParams;'), 'onShowFileChooser'), 0x0001, code_show_fc),
            ],
        ),
        (
            T_CLIENT, 0x0001, 'Landroid/webkit/WebViewClient;', 'MainActivity.java',
            [],
            [((T_CLIENT, T_ACT, 'activity'), 0x0010)],
            [((T_CLIENT, 'V', (T_ACT,), '<init>'), 0x10001, code_client_init)],
            [
                ((T_CLIENT, 'Z', ('Landroid/webkit/WebView;', 'Ljava/lang/String;'), 'shouldOverrideUrlLoading'), 0x0001, code_override_url),
            ],
        ),
        (
            T_ACT, 0x0001, 'Landroid/app/Activity;', 'MainActivity.java',
            [],
            [
                ((T_ACT, 'Landroid/webkit/ValueCallback;', 'filePathCallback'), 0x0001),
                ((T_ACT, 'Ljava/lang/String;', 'pendingSaveData'), 0x0001),
                ((T_ACT, 'Landroid/webkit/WebView;', 'webView'), 0x0001),
            ],
            [((T_ACT, 'V', (), '<init>'), 0x10001, code_act_init)],
            [
                ((T_ACT, 'V', ('I', 'I', 'Landroid/content/Intent;'), 'onActivityResult'), 0x0004, code_act_res),
                ((T_ACT, 'V', (), 'onBackPressed'), 0x0001, code_back),
                ((T_ACT, 'V', ('Landroid/os/Bundle;',), 'onCreate'), 0x0004, code_oncreate),
            ],
        ),
        (
            T_R_ATTR, 0x0011, 'Ljava/lang/Object;', 'R.java',
            [], [],
            [((T_R_ATTR, 'V', (), '<init>'), 0x10001, code_r_attr_init)],
            [],
        ),
        (
            T_R_DRAW, 0x0011, 'Ljava/lang/Object;', 'R.java',
            [((T_R_DRAW, 'I', 'ic_launcher'), 0x0019)],
            [],
            [((T_R_DRAW, 'V', (), '<init>'), 0x10001, code_r_draw_init)],
            [],
        ),
        (
            T_R_STR, 0x0011, 'Ljava/lang/Object;', 'R.java',
            [((T_R_STR, 'I', 'app_name'), 0x0019)],
            [],
            [((T_R_STR, 'V', (), '<init>'), 0x10001, code_r_str_init)],
            [],
        ),
        (
            T_R, 0x0011, 'Ljava/lang/Object;', 'R.java',
            [], [],
            [((T_R, 'V', (), '<init>'), 0x10001, code_r_init)],
            [],
        ),
    ]
    class_specs.sort(key=lambda c: type_idx[c[0]])

    num_strings = len(strings)
    num_types = len(type_descs)
    num_protos = len(sorted_protos)
    num_fields = len(sorted_fields)
    num_methods = len(sorted_methods)
    num_classes = len(class_specs)

    off_header = 0
    off_string_ids = 0x70
    off_type_ids = off_string_ids + num_strings * 4
    off_proto_ids = off_type_ids + num_types * 4
    off_field_ids = off_proto_ids + num_protos * 12
    off_method_ids = off_field_ids + num_fields * 8
    off_class_defs = off_method_ids + num_methods * 8
    off_data = off_class_defs + num_classes * 32

    buf = bytearray(off_data)

    code_items_list = [
        code_chrome_init, code_jsprompt, code_show_fc,
        code_client_init, code_override_url,
        code_act_init, code_act_res, code_back, code_oncreate,
        code_r_attr_init, code_r_draw_init, code_r_str_init, code_r_init,
    ]
    code_item_offs = {}
    for ci in code_items_list:
        align4(buf)
        code_item_offs[id(ci)] = len(buf)
        buf.extend(ci)

    # Note: Do NOT add trailing padding after the last type_list before string_data_off!
    align4(buf)
    type_lists_off = len(buf)
    param_list_offs = {}
    unique_param_tuples = []
    for _, params in sorted_protos:
        if params and params not in param_list_offs:
            align4(buf)
            param_list_offs[params] = len(buf)
            unique_param_tuples.append(params)
            buf.extend(struct.pack('<I', len(params)))
            for p in params:
                buf.extend(struct.pack('<H', type_idx[p]))

    string_data_off = len(buf)
    string_data_offs = []
    for s in strings:
        string_data_offs.append(len(buf))
        buf.extend(mutf8_encode(s))

    class_data_off = len(buf)
    class_data_offs = []
    for c_type, acc, sup_t, src_f, s_fields, i_fields, d_methods, v_methods in class_specs:
        class_data_offs.append(len(buf))
        cd = bytearray()
        cd.extend(uleb128(len(s_fields)))
        cd.extend(uleb128(len(i_fields)))
        cd.extend(uleb128(len(d_methods)))
        cd.extend(uleb128(len(v_methods)))
        prev = 0
        for f_key, f_acc in s_fields:
            fi = field_idx[f_key]
            cd.extend(uleb128(fi - prev))
            cd.extend(uleb128(f_acc))
            prev = fi
        prev = 0
        for f_key, f_acc in i_fields:
            fi = field_idx[f_key]
            cd.extend(uleb128(fi - prev))
            cd.extend(uleb128(f_acc))
            prev = fi
        prev = 0
        for m_key, m_acc, m_code in d_methods:
            mi = method_idx[m_key]
            cd.extend(uleb128(mi - prev))
            cd.extend(uleb128(m_acc))
            cd.extend(uleb128(code_item_offs[id(m_code)]))
            prev = mi
        prev = 0
        for m_key, m_acc, m_code in v_methods:
            mi = method_idx[m_key]
            cd.extend(uleb128(mi - prev))
            cd.extend(uleb128(m_acc))
            cd.extend(uleb128(code_item_offs[id(m_code)]))
            prev = mi
        buf.extend(cd)

    align4(buf)
    map_off = len(buf)
    map_entries = [
        (0x0000, 1, off_header),
        (0x0001, num_strings, off_string_ids),
        (0x0002, num_types, off_type_ids),
        (0x0003, num_protos, off_proto_ids),
        (0x0004, num_fields, off_field_ids),
        (0x0005, num_methods, off_method_ids),
        (0x0006, num_classes, off_class_defs),
        (0x2001, len(code_items_list), off_data),
        (0x1001, len(unique_param_tuples), type_lists_off),
        (0x2002, num_strings, string_data_off),
        (0x2000, num_classes, class_data_off),
        (0x1000, 1, map_off),
    ]
    buf.extend(struct.pack('<I', len(map_entries)))
    for m_type, m_size, m_offset in map_entries:
        buf.extend(struct.pack('<HHII', m_type, 0, m_size, m_offset))

    file_size = len(buf)
    data_size = file_size - off_data

    for i, s_off in enumerate(string_data_offs):
        struct.pack_into('<I', buf, off_string_ids + i * 4, s_off)
    for i, t in enumerate(type_descs):
        struct.pack_into('<I', buf, off_type_ids + i * 4, str_idx[t])
    for i, (ret_t, params) in enumerate(sorted_protos):
        sh = unique_protos[(ret_t, params)]
        p_off = param_list_offs[params] if params else 0
        struct.pack_into('<III', buf, off_proto_ids + i * 12, str_idx[sh], type_idx[ret_t], p_off)
    for i, (c_t, f_t, f_name) in enumerate(sorted_fields):
        struct.pack_into('<HHI', buf, off_field_ids + i * 8, type_idx[c_t], type_idx[f_t], str_idx[f_name])
    for i, (c_t, ret_t, params, m_name) in enumerate(sorted_methods):
        struct.pack_into('<HHI', buf, off_method_ids + i * 8, type_idx[c_t], proto_idx[(ret_t, params)], str_idx[m_name])
    for i, (c_type, acc, sup_t, src_f, _, _, _, _) in enumerate(class_specs):
        struct.pack_into(
            '<IIIIIIII', buf, off_class_defs + i * 32,
            type_idx[c_type], acc, type_idx[sup_t], 0, str_idx[src_f], 0, class_data_offs[i], 0
        )

    buf[0:8] = b'dex\n035\x00'
    struct.pack_into(
        '<IIIIIIIIIIIIIIIIIIII', buf, 32,
        file_size, 0x70, 0x12345678, 0, 0, map_off,
        num_strings, off_string_ids,
        num_types, off_type_ids,
        num_protos, off_proto_ids,
        num_fields, off_field_ids,
        num_methods, off_method_ids,
        num_classes, off_class_defs,
        data_size, off_data,
    )
    buf[12:32] = hashlib.sha1(buf[32:]).digest()
    struct.pack_into('<I', buf, 8, zlib.adler32(buf[12:]) & 0xFFFFFFFF)
    return bytes(buf)


def extract_and_patch_android_binaries(package_name: str):
    """
    Extracts genuine aapt compiled AndroidManifest.xml, resources.arsc,
    and res/drawable/ic_launcher.png from scripts/core-android-binaries.zip,
    builds enhanced classes.dex with WebChromeClient file/image chooser & SAF backup save,
    and patches:
      - package name ('com.javaneh.smart' or 'com.javaneh.habit', 17 chars)
      - versionCode = 240
      - versionName = '2.4.0'
      - minSdkVersion = 21
      - targetSdkVersion = 33
    """
    assert len(package_name) == 17, f'Package name must be 17 chars, got {len(package_name)}'
    core_cache_path = os.path.join(SCRIPTS_DIR, 'core-android-binaries.zip')

    with zipfile.ZipFile(core_cache_path, 'r') as z:
        axml = bytearray(z.read('AndroidManifest.xml'))
        arsc = bytearray(z.read('resources.arsc'))
        ic_launcher = z.read('res/drawable/ic_launcher.png')

    # 1. Patch package name across both UTF-16LE representations
    new_u16 = package_name.encode('utf-16le')
    for candidate_pkg in ('com.javaneh.habit', 'com.javaneh.smart'):
        if candidate_pkg != package_name:
            old_u16 = candidate_pkg.encode('utf-16le')
            axml = axml.replace(old_u16, new_u16)
            arsc = arsc.replace(old_u16, new_u16)

    # 2. Generate enhanced classes.dex with WebChromeClient.onShowFileChooser, onJsPrompt, and MainActivity.onActivityResult
    dex = build_enhanced_dex(package_name)

    # 3. Patch AndroidManifest.xml versionName, versionCode, minSdkVersion, targetSdkVersion
    pos = 8
    strings = []
    while pos < len(axml):
        ctype, cheader, csize = struct.unpack_from('<HHI', axml, pos)
        if ctype == 0x0001:
            scount, stylecount, flags, sstart, stylestart = struct.unpack_from('<IIIII', axml, pos + 8)
            for i in range(scount):
                soff = struct.unpack_from('<I', axml, pos + 28 + i * 4)[0]
                p = pos + sstart + soff
                u16len = struct.unpack_from('<H', axml, p)[0]
                s = axml[p + 2 : p + 2 + u16len * 2].decode('utf-16le', errors='replace')
                if s in ('2.0.0', '2.1.0', '2.2.0', '2.3.0', '2.4.0') and u16len == 5:
                    axml[p + 2 : p + 2 + 10] = VERSION_NAME.encode('utf-16le')
                    s = VERSION_NAME
                strings.append(s)
        elif ctype == 0x0102:
            ns, name, attr_start, attr_size, attr_count = struct.unpack_from('<IIHHH', axml, pos + 16)
            el_name = strings[name] if name < len(strings) else ''
            apos = pos + 16 + attr_start
            for a in range(attr_count):
                off = apos + a * 20
                ans, aname, raw_val, tsize, r0, dtype, dval = struct.unpack_from('<IIIHBBI', axml, off)
                attr_name = strings[aname] if aname < len(strings) else ''
                if el_name == 'manifest' and attr_name == 'versionCode' and dtype == 16:
                    struct.pack_into('<I', axml, off + 16, VERSION_CODE)
                elif el_name == 'uses-sdk' and attr_name == 'minSdkVersion' and dtype == 16:
                    struct.pack_into('<I', axml, off + 16, MIN_SDK)
                elif el_name == 'uses-sdk' and attr_name == 'targetSdkVersion' and dtype == 16:
                    struct.pack_into('<I', axml, off + 16, TARGET_SDK)
        pos += csize

    return bytes(axml), bytes(arsc), dex, ic_launcher


def build_self_contained_webview_html(dist_dir: str) -> bytes:
    """
    Inlines compiled CSS and JS bundles directly into assets/index.html so that
    Android WebView (file:///android_asset/index.html) executes the complete React app
    without any file:// CORS or ES module fetch errors.
    """
    index_path = os.path.join(dist_dir, 'index.html')
    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()

    css_files = sorted(glob.glob(os.path.join(dist_dir, 'assets', '*.css')))
    js_files = sorted(
        [p for p in glob.glob(os.path.join(dist_dir, 'assets', '*.js')) if 'workbox' not in os.path.basename(p)]
    )

    inline_css = ''
    for cp in css_files:
        with open(cp, 'r', encoding='utf-8') as f:
            inline_css += f.read() + '\n'

    inline_js = ''
    for jp in js_files:
        with open(jp, 'r', encoding='utf-8') as f:
            code = f.read()
            code = code.replace('</script>', '<\\/script>')
            inline_js += code + '\n'

    html = re.sub(r'<script[^>]+src="[^"]*assets/[^"]+\.js"[^>]*>\s*</script>', '', html)
    html = re.sub(r'<link[^>]+href="[^"]*assets/[^"]+\.css"[^>]*>', '', html)

    if inline_css:
        html = html.replace('</head>', f'<style>{inline_css}</style>\n</head>', 1)

    if inline_js:
        html = html.replace(
            '<div id="root"></div>',
            f'<div id="root"></div>\n<script type="module">\n{inline_js}\n</script>',
            1,
        )

    return html.encode('utf-8')


def create_aligned_zip(entries):
    """
    Creates a clean, deterministic ZIP archive matching official Android zipalign & apksigner:
      - Uncompressed entries (ZIP_STORED = 0) are 4-byte aligned in LFH (data_offset % 4 == 0).
      - Central Directory (CD) headers have 0-byte extra field (extra_len = 0), matching AOSP ZipAlign.cpp.
      - The final entry's LFH extra field is padded so that len(before_sig) is an exact multiple of 4096 bytes,
        ensuring both the APK Signing Block start offset and Central Directory start offset are 4096-page-aligned.
    """
    out = bytearray()
    cd_records = []
    num_entries = len(entries)

    for idx, (filename, data, compress_type) in enumerate(entries):
        fn_bytes = filename.encode('utf-8')
        crc = zlib.crc32(data) & 0xFFFFFFFF
        usize = len(data)

        if compress_type == zipfile.ZIP_DEFLATED:
            comp_obj = zlib.compressobj(6, zlib.DEFLATED, -15)
            c_data = comp_obj.compress(data) + comp_obj.flush()
            csize = len(c_data)
        else:
            c_data = data
            csize = usize

        lfh_offset = len(out)
        base_end = lfh_offset + 30 + len(fn_bytes)

        lfh_extra = b''
        if compress_type == zipfile.ZIP_STORED:
            rem = base_end % 4
            if rem != 0:
                pad_len = (4 - rem) % 4
                lfh_extra = b'\x00' * pad_len

        # If this is the very last entry, pad LFH extra so total len(out) after c_data is a multiple of 4096
        if idx == num_entries - 1:
            projected_end = base_end + len(lfh_extra) + csize
            rem4096 = projected_end % 4096
            if rem4096 != 0:
                pad4096 = (4096 - rem4096) % 4096
                lfh_extra = lfh_extra + (b'\x00' * pad4096)

        data_offset = base_end + len(lfh_extra)
        if compress_type == zipfile.ZIP_STORED:
            assert data_offset % 4 == 0, f'Unaligned stored entry {filename}: {data_offset}'

        dos_time = 0x0000
        dos_date = ((2025 - 1980) << 9) | (1 << 5) | 1
        flags = 0x0000
        ver_needed = 20

        lfh = struct.pack(
            '<4sHHHHHIIIHH',
            b'PK\x03\x04',
            ver_needed,
            flags,
            compress_type,
            dos_time,
            dos_date,
            crc,
            csize,
            usize,
            len(fn_bytes),
            len(lfh_extra),
        )
        out.extend(lfh)
        out.extend(fn_bytes)
        out.extend(lfh_extra)
        out.extend(c_data)

        # Central Directory record: extra_len = 0 (standard zipalign behavior)
        cd_hdr = struct.pack(
            '<4sHHHHHHIIIHHHHHII',
            b'PK\x01\x02',
            20,
            ver_needed,
            flags,
            compress_type,
            dos_time,
            dos_date,
            crc,
            csize,
            usize,
            len(fn_bytes),
            0,  # CD extra len = 0
            0,
            0,
            0,
            0,
            lfh_offset,
        )
        cd_records.append(cd_hdr + fn_bytes)

    assert len(out) % 4096 == 0, f'before_sig not 4096-aligned: {len(out)}'
    cd_offset = len(out)
    cd_bytes = b''.join(cd_records)
    cd_size = len(cd_bytes)

    eocd = struct.pack(
        '<4sHHHHIIH',
        b'PK\x05\x06',
        0,
        0,
        num_entries,
        num_entries,
        cd_size,
        cd_offset,
        0,
    )
    return bytes(out), cd_bytes, eocd


def compute_apk_v2_v3_digest(before_sig: bytes, cd_bytes: bytes, eocd_bytes: bytes) -> bytes:
    eocd_mod = bytearray(eocd_bytes)
    struct.pack_into('<I', eocd_mod, 16, len(before_sig))

    chunk_digests = []
    for section in (before_sig, cd_bytes, bytes(eocd_mod)):
        pos = 0
        while pos < len(section):
            chunk = section[pos : pos + 1048576]
            h = hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest()
            chunk_digests.append(h)
            pos += 1048576

    top_data = b'\x5a' + struct.pack('<I', len(chunk_digests)) + b''.join(chunk_digests)
    return hashlib.sha256(top_data).digest()


def lp_slice(data: bytes) -> bytes:
    return struct.pack('<I', len(data)) + data


def rsa_sha256_sign(key_pem_path: str, data: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(data)
        tmp_path = tf.name
    try:
        return subprocess.check_output(
            ['openssl', 'dgst', '-sha256', '-sign', key_pem_path, tmp_path]
        )
    finally:
        os.unlink(tmp_path)


def build_v2_v3_signing_block(top_digest: bytes, key_pem_path: str, cert_der: bytes, spki_der: bytes) -> bytes:
    sig_algo_id = 0x0103  # RSASSA-PKCS1-v1_5 with SHA2-256

    digest_entry = lp_slice(struct.pack('<I', sig_algo_id) + lp_slice(top_digest))
    digests_slice = lp_slice(digest_entry)
    certs_slice = lp_slice(lp_slice(cert_der))

    # 1. APK Signature Scheme v2 (ID = 0x7109871a)
    v2_attr = lp_slice(struct.pack('<II', 0xBEEFF00D, 3))
    v2_attrs_slice = lp_slice(v2_attr)
    v2_signed_data = digests_slice + certs_slice + v2_attrs_slice
    v2_sig = rsa_sha256_sign(key_pem_path, v2_signed_data)
    v2_sigs_slice = lp_slice(lp_slice(struct.pack('<I', sig_algo_id) + lp_slice(v2_sig)))
    v2_signer = lp_slice(v2_signed_data) + v2_sigs_slice + lp_slice(spki_der)
    v2_block_value = lp_slice(lp_slice(v2_signer))

    # 2. APK Signature Scheme v3 (ID = 0xf05368c0)
    min_sdk = MIN_SDK
    max_sdk = 0x7FFFFFFF
    v3_attrs_slice = lp_slice(b'')
    v3_signed_data = (
        digests_slice
        + certs_slice
        + struct.pack('<II', min_sdk, max_sdk)
        + v3_attrs_slice
    )
    v3_sig = rsa_sha256_sign(key_pem_path, v3_signed_data)
    v3_sigs_slice = lp_slice(lp_slice(struct.pack('<I', sig_algo_id) + lp_slice(v3_sig)))
    v3_signer = (
        lp_slice(v3_signed_data)
        + struct.pack('<II', min_sdk, max_sdk)
        + v3_sigs_slice
        + lp_slice(spki_der)
    )
    v3_block_value = lp_slice(lp_slice(v3_signer))

    def make_id_value_pair(pair_id: int, val: bytes) -> bytes:
        return struct.pack('<QI', 4 + len(val), pair_id) + val

    pairs = make_id_value_pair(0x7109871A, v2_block_value) + make_id_value_pair(0xF05368C0, v3_block_value)

    base_total = 8 + len(pairs) + 24
    rem = (base_total + 12) % 4096
    pad_val_len = (4096 - rem) % 4096
    pad_pair = make_id_value_pair(0x42726577, b'\x00' * pad_val_len)
    all_pairs = pairs + pad_pair

    size_of_block = len(all_pairs) + 24
    sig_block = (
        struct.pack('<Q', size_of_block)
        + all_pairs
        + struct.pack('<Q', size_of_block)
        + b'APK Sig Block 42'
    )
    assert len(sig_block) % 4096 == 0, f'Sig block not 4096-aligned: {len(sig_block)}'
    return sig_block


def assemble_and_sign_apk(package_name: str, key_pem_path: str, cert_pem_path: str, cert_der: bytes, spki_der: bytes) -> bytes:
    axml, arsc, dex, ic_launcher = extract_and_patch_android_binaries(package_name)

    entries = []
    entries.append(('AndroidManifest.xml', axml, zipfile.ZIP_DEFLATED))

    if os.path.exists(WEB_DIST):
        webview_html = build_self_contained_webview_html(WEB_DIST)
        entries.append(('assets/index.html', webview_html, zipfile.ZIP_DEFLATED))

        for root, dirs, files in os.walk(WEB_DIST):
            dirs.sort()
            for fname in sorted(files):
                if fname == 'index.html' or fname.endswith('.apk') or fname.endswith('.tmp'):
                    continue
                full_path = os.path.join(root, fname)
                rel_path = os.path.relpath(full_path, WEB_DIST).replace(os.sep, '/')
                arc_name = f'assets/{rel_path}'
                with open(full_path, 'rb') as f:
                    f_bytes = f.read()
                comp = zipfile.ZIP_STORED if fname.endswith('.png') else zipfile.ZIP_DEFLATED
                entries.append((arc_name, f_bytes, comp))

    entries.append(('res/drawable/ic_launcher.png', ic_launcher, zipfile.ZIP_STORED))
    entries.append(('resources.arsc', arsc, zipfile.ZIP_STORED))
    entries.append(('classes.dex', dex, zipfile.ZIP_STORED))

    # Generate V1 (JAR PKCS#7) signature files with MANIFEST.MF first
    mf_lines = ['Manifest-Version: 1.0', 'Created-By: 1.0 (Android)', '']
    entry_sections = []
    for name, data, _ in entries:
        digest_b64 = base64.b64encode(hashlib.sha256(data).digest()).decode('ascii')
        section = f'Name: {name}\r\nSHA-256-Digest: {digest_b64}\r\n\r\n'
        entry_sections.append(section)

    manifest_mf = ('\r\n'.join(mf_lines) + '\r\n' + ''.join(entry_sections)).encode('utf-8')
    mf_digest_b64 = base64.b64encode(hashlib.sha256(manifest_mf).digest()).decode('ascii')

    sf_header = (
        'Signature-Version: 1.0\r\n'
        'Created-By: 1.0 (Android)\r\n'
        f'SHA-256-Digest-Manifest: {mf_digest_b64}\r\n'
        'X-Android-APK-Signed: 2, 3\r\n\r\n'
    )
    sf_sections = []
    for section in entry_sections:
        sec_digest_b64 = base64.b64encode(hashlib.sha256(section.encode('utf-8')).digest()).decode('ascii')
        name_line = section.split('\r\n', 1)[0]
        sf_sections.append(f'{name_line}\r\nSHA-256-Digest: {sec_digest_b64}\r\n\r\n')

    javaneh_sf = (sf_header + ''.join(sf_sections)).encode('utf-8')

    with tempfile.NamedTemporaryFile(delete=False) as tf_sf:
        tf_sf.write(javaneh_sf)
        sf_path = tf_sf.name
    rsa_path = sf_path + '.rsa'
    try:
        subprocess.run(
            [
                'openssl', 'cms', '-sign', '-binary', '-noattr',
                '-in', sf_path,
                '-signer', cert_pem_path,
                '-inkey', key_pem_path,
                '-outform', 'DER',
                '-out', rsa_path,
                '-md', 'sha256',
            ],
            check=True,
        )
        with open(rsa_path, 'rb') as f:
            javaneh_rsa = f.read()
    finally:
        if os.path.exists(sf_path):
            os.unlink(sf_path)
        if os.path.exists(rsa_path):
            os.unlink(rsa_path)

    # Standard JAR order: MANIFEST.MF first, then .SF, then .RSA
    entries.append(('META-INF/MANIFEST.MF', manifest_mf, zipfile.ZIP_DEFLATED))
    entries.append(('META-INF/JAVANEH.SF', javaneh_sf, zipfile.ZIP_DEFLATED))
    entries.append(('META-INF/JAVANEH.RSA', javaneh_rsa, zipfile.ZIP_DEFLATED))

    before_sig, cd_bytes, eocd_bytes = create_aligned_zip(entries)
    top_digest = compute_apk_v2_v3_digest(before_sig, cd_bytes, eocd_bytes)
    sig_block = build_v2_v3_signing_block(top_digest, key_pem_path, cert_der, spki_der)

    new_cd_offset = len(before_sig) + len(sig_block)
    assert new_cd_offset % 4096 == 0, f'new_cd_offset not 4096-aligned: {new_cd_offset}'
    eocd_final = bytearray(eocd_bytes)
    struct.pack_into('<I', eocd_final, 16, new_cd_offset)

    return before_sig + sig_block + cd_bytes + bytes(eocd_final)


def build_complete_apk():
    print('[Javaneh APK Builder] 1/3 Loading RSA-2048 key and X.509 v3 certificates (with SubjectKeyIdentifier)...')
    (
        key_pem_path,
        cert_pem_path,
        backdated_cert_der,
        orig_cert_pem_path,
        orig_cert_der,
        spki_der,
    ) = load_keystore_and_certificates()

    print(f'[Javaneh APK Builder] 2/3 Building Primary Conflict-Free APK (com.javaneh.smart, v{VERSION_NAME}, Build {VERSION_CODE})...')
    primary_apk = assemble_and_sign_apk(
        'com.javaneh.smart',
        key_pem_path,
        cert_pem_path,
        backdated_cert_der,
        spki_der,
    )
    primary_sha256 = hashlib.sha256(primary_apk).hexdigest()

    print(f'[Javaneh APK Builder] 3/3 Building Legacy In-Place Update APK (com.javaneh.habit, v{VERSION_NAME}, Build {VERSION_CODE})...')
    legacy_apk = assemble_and_sign_apk(
        'com.javaneh.habit',
        key_pem_path,
        orig_cert_pem_path,
        orig_cert_der,
        spki_der,
    )
    legacy_sha256 = hashlib.sha256(legacy_apk).hexdigest()

    primary_targets = [
        os.path.join(WEB_PUBLIC, 'Javaneh-App.apk'),
        os.path.join(WEB_PUBLIC, 'javaneh-app.apk'),
        os.path.join(WEB_PUBLIC, 'javaneh.apk'),
        os.path.join(ROOT_PUBLIC, 'Javaneh-App.apk'),
        os.path.join(ROOT_PUBLIC, 'javaneh-app.apk'),
        os.path.join(ROOT_PUBLIC, 'javaneh.apk'),
        os.path.join(WEB_DIST, 'Javaneh-App.apk'),
        os.path.join(WEB_DIST, 'javaneh-app.apk'),
        os.path.join(WEB_DIST, 'javaneh.apk'),
        os.path.join(ROOT_DIST, 'Javaneh-App.apk'),
        os.path.join(ROOT_DIST, 'javaneh-app.apk'),
        os.path.join(ROOT_DIST, 'javaneh.apk'),
    ]
    for t in primary_targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        with open(t, 'wb') as f:
            f.write(primary_apk)

    legacy_targets = [
        os.path.join(WEB_PUBLIC, 'Javaneh-Update.apk'),
        os.path.join(WEB_PUBLIC, 'javaneh-legacy.apk'),
        os.path.join(ROOT_PUBLIC, 'Javaneh-Update.apk'),
        os.path.join(ROOT_PUBLIC, 'javaneh-legacy.apk'),
        os.path.join(WEB_DIST, 'Javaneh-Update.apk'),
        os.path.join(WEB_DIST, 'javaneh-legacy.apk'),
        os.path.join(ROOT_DIST, 'Javaneh-Update.apk'),
        os.path.join(ROOT_DIST, 'javaneh-legacy.apk'),
    ]
    for t in legacy_targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        with open(t, 'wb') as f:
            f.write(legacy_apk)

    with open(os.path.join(SCRIPTS_DIR, 'javaneh.apk.base64'), 'w', encoding='utf-8') as f:
        f.write(base64.b64encode(primary_apk).decode('ascii'))

    print(f'[Javaneh APK Builder] Primary APK (com.javaneh.smart): Size={len(primary_apk)} bytes, SHA256={primary_sha256}')
    print(f'[Javaneh APK Builder] Legacy APK  (com.javaneh.habit): Size={len(legacy_apk)} bytes, SHA256={legacy_sha256}')


if __name__ == '__main__':
    build_complete_apk()
