FROM node:22-alpine

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

# production nginx image
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
