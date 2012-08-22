class CreateProducts < ActiveRecord::Migration
  def change
    create_table :products do |t|
      t.string :brand
      t.string :category
      t.text :description
      t.string :name
      t.float :price

      t.timestamps
    end
  end
end
