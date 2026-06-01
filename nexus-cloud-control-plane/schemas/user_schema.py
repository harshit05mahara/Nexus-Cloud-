from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    wallet_balance: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str