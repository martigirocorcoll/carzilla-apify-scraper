# Use official Apify Actor Node.js image with Playwright dependencies
FROM apify/actor-node-playwright-chrome:18

# Copy source code
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to keep the image small
RUN npm ci --only=production --no-optional \
    && npm cache clean --force

# Copy source code
COPY . ./

# Define run command
CMD ["npm", "start"]