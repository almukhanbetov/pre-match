FROM golang:1.24-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go mod tidy && go build -o server main.go

EXPOSE 8888

CMD ["./server"]

