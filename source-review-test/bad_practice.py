# 規約2違反: マジックナンバーが直接使われている
# 規約3違反: クラス名が snake_case になっている (本来は PascalCase)
class user_manager:
    def __init__(self):
        # 規約4違反: 外部から隠蔽すべき変数だがスコープ修飾子がない
        self.user_data = {"admin": "root", "guest": "1234"}

    # 規約3違反: 関数名が camelCase になっている (本来は snake_case)
    def get_User_Info(self, username):
        if username in self.user_data:
            # 規約1違反: 辞書で返却している
            # 規約2違反: 99 というマジックナンバー
            return {"status": 200, "role": self.user_data[username], "code": 99}
        
        # 規約1違反: 辞書で返却している
        return {"status": 404, "role": None, "code": 0}

# 規約3違反: 変数名が大文字から始まっている
Data = user_manager()
print(Data.get_User_Info("admin"))

# 規約2違反: 1.10 というマジックナンバーを直接計算に使用
def calculate_tax(price):
    return price * 1.10