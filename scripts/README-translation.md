# AI-Powered Translation System

This directory contains scripts for automatically translating i18n files using AI services.

## 🚀 Quick Start

### Option 1: Free Translation (Recommended)
```bash
# Install dependencies
npm install translate-google-api

# Run translation
npm run translate
```

### Option 2: AI Translation (Higher Quality)
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Run AI translation
npm run translate:ai
```

## 📁 Files

- `translate-i18n-free.js` - Free translation using Google Translate
- `translate-i18n.js` - AI-powered translation using OpenAI GPT-4
- `README-translation.md` - This documentation

## 🔧 Configuration

### Free Translation Script
- **Service**: Google Translate (via translate-google-api)
- **Cost**: Free
- **Quality**: Good for basic translations
- **Rate Limits**: 2-second delay between requests

### AI Translation Script
- **Service**: OpenAI GPT-4o-mini
- **Cost**: ~$0.01-0.05 per translation (very affordable)
- **Quality**: High-quality, context-aware translations
- **Rate Limits**: 1-second delay between requests

## 📋 Usage

### Basic Usage
```bash
# Free translation (recommended for most cases)
npm run translate

# AI translation (for higher quality)
npm run translate:ai
```

### Advanced Usage
```bash
# AI translation with custom API key
node scripts/translate-i18n.js --api-key sk-your-key-here

# Translate to specific languages
node scripts/translate-i18n.js --targets fr,de,es

# Custom source language
node scripts/translate-i18n.js --source en --targets fr,de
```

## 🌍 Supported Languages

### Currently Configured
- **Source**: English (en)
- **Targets**: French (fr), German (de)

### Adding More Languages
Edit the `CONFIG.targetLanguages` array in either script:
```javascript
targetLanguages: ['fr', 'de', 'es', 'it'] // Add more languages
```

## 📊 Translation Quality

### Free Translation
- ✅ Good for basic UI text
- ✅ Fast and free
- ⚠️ May need manual review for complex phrases
- ⚠️ Less context-aware

### AI Translation
- ✅ High-quality, context-aware translations
- ✅ Understands software terminology
- ✅ Maintains consistent tone
- ✅ Handles complex phrases well
- 💰 Small cost per translation

## 🔍 What Gets Translated

The scripts translate:
- ✅ All string values in the JSON
- ✅ UI text, buttons, labels
- ✅ Error messages
- ✅ Page titles and descriptions
- ✅ Form labels and placeholders

The scripts preserve:
- 🔒 JSON keys (never translated)
- 🔒 HTML tags and attributes
- 🔒 Variable interpolations ({{variable}})
- 🔒 JSON structure and formatting

## 📝 Example Output

### Before (English)
```json
{
  "loginPage": {
    "title": "Welcome to {{appName}}",
    "subtitle": "Sign in to your account to continue"
  },
  "buttons": {
    "login": "Log In",
    "signup": "Sign Up"
  }
}
```

### After (French)
```json
{
  "loginPage": {
    "title": "Bienvenue sur {{appName}}",
    "subtitle": "Connectez-vous à votre compte pour continuer"
  },
  "buttons": {
    "login": "Se connecter",
    "signup": "S'inscrire"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "translate-google-api not found"
```bash
npm install translate-google-api
```

#### 2. "OpenAI API Error"
- Check your API key: `echo $OPENAI_API_KEY`
- Verify you have credits in your OpenAI account
- Check your internet connection

#### 3. "Source file not found"
- Make sure you're running from the project root
- Check that `frontend/public/locales/en/translation.json` exists

#### 4. Translation quality issues
- Try the AI translation script for better quality
- Review and manually adjust translations after running
- Consider adding more context to the prompts

### Debug Mode
Add `console.log` statements to see what's being translated:
```javascript
console.log('Translating:', value);
const translated = await translate(value, { to: targetLang });
console.log('Result:', translated);
```

## 🔄 Workflow

### Recommended Process
1. **Run translation script**
   ```bash
   npm run translate
   ```

2. **Review translations**
   - Check the generated files
   - Test in the application
   - Look for any obvious errors

3. **Manual adjustments**
   - Fix any incorrect translations
   - Adjust tone or terminology
   - Ensure consistency

4. **Commit changes**
   ```bash
   git add frontend/public/locales/
   git commit -m "feat: add French and German translations"
   ```

### For Large Projects
1. **Start with free translation** for initial pass
2. **Use AI translation** for critical pages
3. **Manual review** for important user-facing text
4. **Iterative improvement** based on user feedback

## 💡 Tips

### Getting Better Translations
1. **Use AI translation** for important pages
2. **Add context** to the source English text
3. **Review and refine** after automatic translation
4. **Test with native speakers** when possible

### Cost Optimization
1. **Start with free translation** for initial pass
2. **Use AI only for critical pages** if budget is tight
3. **Batch translate** multiple files at once
4. **Review before re-translating** to avoid unnecessary costs

### Quality Assurance
1. **Test all pages** in different languages
2. **Check for missing translations** (empty strings)
3. **Verify context** makes sense
4. **Ensure consistency** across similar terms

## 📈 Future Improvements

### Planned Features
- [ ] Support for more languages
- [ ] Translation memory/cache
- [ ] Batch processing for multiple files
- [ ] Integration with translation management systems
- [ ] Quality scoring and suggestions
- [ ] Automatic testing of translated content

### Contributing
To improve the translation scripts:
1. Fork the repository
2. Make your changes
3. Test with different languages
4. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console output for error messages
3. Test with a smaller file first
4. Open an issue with details about the problem

---

**Happy translating! 🌍✨**